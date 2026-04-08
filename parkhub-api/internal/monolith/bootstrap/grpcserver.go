package bootstrap

import (
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"

	"github.com/parkhub/api/internal/pkg/grpcx"
)

const bufconnBufSize = 1 << 20 // 1 MiB

// InitGRPCServer creates an in-process gRPC server backed by a bufconn listener
// and wraps it in a grpcx.Registry. Returning the Registry (rather than the bare
// server + listener) gives downstream wiring a single object on which to call
// Register / GetClient.
//
// The server is pre-configured with:
//   - TenantInterceptor: injects TenantInfo from metadata into context
//   - OTel stats handler: propagates trace context across in-process calls
//
// No gRPC services are registered here; domain wiring code calls
// registry.Register("...", corev1.RegisterXxxServer) in Phase 1.
func InitGRPCServer() (*grpcx.Registry, error) {
	lis := bufconn.Listen(bufconnBufSize)

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(grpcx.TenantInterceptor),
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	)

	reg, err := grpcx.NewRegistry(srv, lis)
	if err != nil {
		return nil, err
	}
	return reg, nil
}
