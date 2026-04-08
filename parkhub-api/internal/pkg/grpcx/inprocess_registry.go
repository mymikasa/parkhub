// Package grpcx provides cross-cutting gRPC primitives shared by all
// monolith domains: tenant interceptor, in-process registry, etc.
//
// # In-process registry
//
// During Phase 1 of the microservices refactor, every domain still lives
// inside the cmd/monolith binary, but they communicate via gRPC contracts
// instead of direct Go function calls. The Registry wires this together:
// it owns a single *grpc.Server and a single bufconn-backed *grpc.ClientConn,
// so a "remote" call goes through the gRPC stack (interceptors, marshaling,
// metadata propagation) but skips the network — Dial/Listen run on an
// in-memory pipe.
//
// Typical bootstrap flow (executed once per process):
//
//	reg, _ := bootstrap.InitGRPCServer()
//
//	// Each domain registers its gRPC service implementation:
//	reg.Register("core.v1.TenantService", func(s *grpc.Server) {
//	    corev1.RegisterTenantServiceServer(s, tenantImpl)
//	})
//
//	// A different domain obtains a typed client:
//	tenantClient, _ := grpcx.GetClient(reg, "core.v1.TenantService", corev1.NewTenantServiceClient)
//
// Because every consumer dials the same shared *grpc.ClientConn, the
// connection is established lazily on first RPC and reused process-wide.
// In Phase 2 (when domains split into separate pods) only the bootstrap
// changes — call sites keep the same Registry API but back it with a
// real network ClientConn pointing at the remote pod.
package grpcx

import (
	"context"
	"errors"
	"fmt"
	"net"
	"sort"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

// ErrServiceNotRegistered is returned by GetClient when the requested
// service name has not been registered with the Registry.
var ErrServiceNotRegistered = errors.New("grpcx: service not registered")

// Registry tracks gRPC services registered with the in-process server and
// hands out a shared client connection that routes through bufconn.
//
// Registry is safe for concurrent use. Register is expected to be called
// during process bootstrap; GetClient / Conn / Has may be called from any
// goroutine afterwards.
type Registry struct {
	srv  *grpc.Server
	lis  *bufconn.Listener
	conn *grpc.ClientConn

	mu       sync.RWMutex
	services map[string]struct{}
}

// NewRegistry constructs a Registry around an existing gRPC server and
// bufconn listener (typically produced by bootstrap.InitGRPCServer).
//
// It eagerly dials the bufconn listener so that callers can obtain the
// shared *grpc.ClientConn immediately, even before srv.Serve has been
// called — bufconn buffers connections until the server starts accepting.
func NewRegistry(srv *grpc.Server, lis *bufconn.Listener) (*Registry, error) {
	if srv == nil {
		return nil, errors.New("grpcx: nil grpc.Server")
	}
	if lis == nil {
		return nil, errors.New("grpcx: nil bufconn.Listener")
	}

	conn, err := grpc.NewClient(
		"passthrough://bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return lis.DialContext(ctx)
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("grpcx: dial in-process conn: %w", err)
	}

	return &Registry{
		srv:      srv,
		lis:      lis,
		conn:     conn,
		services: make(map[string]struct{}),
	}, nil
}

// Register records a gRPC service under the given name and invokes the
// supplied callback so the caller can attach the generated server stub
// (e.g. corev1.RegisterTenantServiceServer) to the underlying *grpc.Server.
//
// Service names should match the fully-qualified protobuf service name
// (for example "core.v1.TenantService"). Registering the same name twice
// returns an error rather than silently overwriting.
func (r *Registry) Register(name string, register func(*grpc.Server)) error {
	if name == "" {
		return errors.New("grpcx: empty service name")
	}
	if register == nil {
		return errors.New("grpcx: nil register func")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.services[name]; exists {
		return fmt.Errorf("grpcx: service %q already registered", name)
	}

	register(r.srv)
	r.services[name] = struct{}{}
	return nil
}

// MustRegister is like Register but panics on error. Use it during process
// bootstrap where a registration failure is unrecoverable.
func (r *Registry) MustRegister(name string, register func(*grpc.Server)) {
	if err := r.Register(name, register); err != nil {
		panic(err)
	}
}

// Has reports whether a service with the given name has been registered.
func (r *Registry) Has(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.services[name]
	return ok
}

// Names returns the sorted list of registered service names. Useful for
// /healthz introspection and debug logging.
func (r *Registry) Names() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]string, 0, len(r.services))
	for name := range r.services {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// Conn returns the shared in-process *grpc.ClientConn. Most callers should
// prefer GetClient, which validates that the target service is registered
// and returns a strongly-typed client.
func (r *Registry) Conn() *grpc.ClientConn {
	return r.conn
}

// Server returns the underlying *grpc.Server. Exposed primarily for tests
// and for advanced bootstrap scenarios (e.g. attaching reflection).
func (r *Registry) Server() *grpc.Server {
	return r.srv
}

// Listener returns the bufconn listener the server should Serve on.
func (r *Registry) Listener() *bufconn.Listener {
	return r.lis
}

// Close releases the shared client connection. The caller is responsible
// for stopping the *grpc.Server separately (typically via GracefulStop in
// the monolith shutdown sequence).
func (r *Registry) Close() error {
	if r.conn == nil {
		return nil
	}
	return r.conn.Close()
}

// ClientFactory is the signature of the generated NewXxxClient constructors
// emitted by protoc-gen-go-grpc, e.g. corev1.NewTenantServiceClient.
type ClientFactory[T any] func(grpc.ClientConnInterface) T

// GetClient returns a typed in-process gRPC client for the named service.
// It returns ErrServiceNotRegistered if Register has not been called for
// the given name, which surfaces wiring mistakes at startup rather than at
// the first RPC.
//
// Example:
//
//	client, err := grpcx.GetClient(reg, "core.v1.TenantService", corev1.NewTenantServiceClient)
//	if err != nil {
//	    return err
//	}
//	resp, err := client.GetTenant(ctx, &corev1.GetTenantRequest{Id: id})
func GetClient[T any](r *Registry, name string, factory ClientFactory[T]) (T, error) {
	var zero T
	if r == nil {
		return zero, errors.New("grpcx: nil Registry")
	}
	if factory == nil {
		return zero, errors.New("grpcx: nil ClientFactory")
	}
	if !r.Has(name) {
		return zero, fmt.Errorf("%w: %q", ErrServiceNotRegistered, name)
	}
	return factory(r.conn), nil
}
