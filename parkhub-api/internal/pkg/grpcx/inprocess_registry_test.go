package grpcx

import (
	"context"
	"errors"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/test/bufconn"
)

type grpchealthClient = grpc_health_v1.HealthClient

func newHealthClient(cc grpc.ClientConnInterface) grpchealthClient {
	return grpc_health_v1.NewHealthClient(cc)
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func newTestRegistry(t *testing.T) *Registry {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	reg, err := NewRegistry(srv, lis)
	if err != nil {
		t.Fatalf("NewRegistry: %v", err)
	}
	// Start serving in background so RPCs can complete.
	go func() {
		if err := srv.Serve(lis); err != nil {
			t.Logf("serve ended: %v", err)
		}
	}()
	t.Cleanup(func() {
		srv.GracefulStop()
		if err := reg.Close(); err != nil {
			t.Logf("registry close: %v", err)
		}
	})
	return reg
}

// ---------------------------------------------------------------------------
// NewRegistry validation
// ---------------------------------------------------------------------------

func TestNewRegistry_NilServer(t *testing.T) {
	lis := bufconn.Listen(1 << 20)
	_, err := NewRegistry(nil, lis)
	if err == nil {
		t.Fatal("expected error for nil server")
	}
}

func TestNewRegistry_NilListener(t *testing.T) {
	srv := grpc.NewServer()
	_, err := NewRegistry(srv, nil)
	if err == nil {
		t.Fatal("expected error for nil listener")
	}
}

// ---------------------------------------------------------------------------
// Register / Has / Names
// ---------------------------------------------------------------------------

func TestRegister_Basic(t *testing.T) {
	reg := newTestRegistry(t)

	called := false
	if err := reg.Register("test.svc", func(s *grpc.Server) { called = true }); err != nil {
		t.Fatalf("Register: %v", err)
	}
	if !called {
		t.Error("register func was not called")
	}
	if !reg.Has("test.svc") {
		t.Error("Has should return true after Register")
	}
}

func TestRegister_Duplicate(t *testing.T) {
	reg := newTestRegistry(t)
	if err := reg.Register("test.svc", func(s *grpc.Server) {}); err != nil {
		t.Fatalf("first Register: %v", err)
	}
	if err := reg.Register("test.svc", func(s *grpc.Server) {}); err == nil {
		t.Fatal("expected error for duplicate registration")
	}
}

func TestRegister_EmptyName(t *testing.T) {
	reg := newTestRegistry(t)
	if err := reg.Register("", func(s *grpc.Server) {}); err == nil {
		t.Fatal("expected error for empty name")
	}
}

func TestRegister_NilFunc(t *testing.T) {
	reg := newTestRegistry(t)
	if err := reg.Register("test.svc", nil); err == nil {
		t.Fatal("expected error for nil register func")
	}
}

func TestMustRegister_Panics(t *testing.T) {
	reg := newTestRegistry(t)
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic")
		}
	}()
	reg.MustRegister("test.svc", func(s *grpc.Server) {})
	reg.MustRegister("test.svc", func(s *grpc.Server) {}) // duplicate → panic
}

func TestNames(t *testing.T) {
	reg := newTestRegistry(t)
	_ = reg.Register("z.svc", func(s *grpc.Server) {})
	_ = reg.Register("a.svc", func(s *grpc.Server) {})
	_ = reg.Register("m.svc", func(s *grpc.Server) {})

	names := reg.Names()
	if len(names) != 3 {
		t.Fatalf("expected 3 names, got %d", len(names))
	}
	for i, want := range []string{"a.svc", "m.svc", "z.svc"} {
		if names[i] != want {
			t.Errorf("names[%d] = %q, want %q", i, names[i], want)
		}
	}
}

func TestHas_NotRegistered(t *testing.T) {
	reg := newTestRegistry(t)
	if reg.Has("missing") {
		t.Error("Has should return false for unregistered service")
	}
}

// ---------------------------------------------------------------------------
// GetClient
// ---------------------------------------------------------------------------

func TestGetClient_NotRegistered(t *testing.T) {
	reg := newTestRegistry(t)
	_, err := GetClient(reg, "missing.svc", newHealthClient)
	if err == nil {
		t.Fatal("expected error for unregistered service")
	}
	if !errors.Is(err, ErrServiceNotRegistered) {
		t.Errorf("expected ErrServiceNotRegistered, got: %v", err)
	}
}

func TestGetClient_NilRegistry(t *testing.T) {
	_, err := GetClient(nil, "test.svc", newHealthClient)
	if err == nil {
		t.Fatal("expected error for nil registry")
	}
}

func TestGetClient_NilFactory(t *testing.T) {
	reg := newTestRegistry(t)
	_, err := GetClient[grpchealthClient](reg, "test.svc", nil)
	if err == nil {
		t.Fatal("expected error for nil factory")
	}
}

// ---------------------------------------------------------------------------
// End-to-end: register + GetClient + RPC via in-process conn
// ---------------------------------------------------------------------------

func TestGetClient_EndToEnd(t *testing.T) {
	reg := newTestRegistry(t)

	// Register the built-in gRPC health service as a stand-in for a real
	// proto-generated service. This exercises the full register → dial → RPC
	// path through bufconn without depending on generated code.
	hsrv := health.NewServer()
	grpc_health_v1.RegisterHealthServer(reg.Server(), hsrv)
	_ = reg.Register("grpc.health.v1.Health", func(s *grpc.Server) {
		// Already registered above; this callback is a no-op.
	})
	hsrv.SetServingStatus("test.svc", grpc_health_v1.HealthCheckResponse_SERVING)

	client, err := GetClient(reg, "grpc.health.v1.Health", newHealthClient)
	if err != nil {
		t.Fatalf("GetClient: %v", err)
	}

	resp, err := client.Check(context.Background(), &grpc_health_v1.HealthCheckRequest{Service: "test.svc"})
	if err != nil {
		t.Fatalf("Check RPC: %v", err)
	}
	if resp.GetStatus() != grpc_health_v1.HealthCheckResponse_SERVING {
		t.Errorf("status = %v, want SERVING", resp.GetStatus())
	}
}
