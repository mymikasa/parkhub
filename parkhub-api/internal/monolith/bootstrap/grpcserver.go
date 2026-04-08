package bootstrap

import (
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"

	"github.com/parkhub/api/internal/pkg/grpcx"
)

const bufconnBufSize = 1 << 20 // 1 MiB

// InitGRPCServer creates an in-process gRPC server backed by a bufconn listener.
//
// The server is pre-configured with:
//   - TenantInterceptor: injects TenantInfo from metadata into context
//   - OTel stats handler: propagates trace context across in-process calls
//
// No gRPC services are registered here; domain services register themselves
// via internal/pkg/grpcx.GetBufconnDialer() in Phase 1.
func InitGRPCServer() (*grpc.Server, *bufconn.Listener) {
	lis := bufconn.Listen(bufconnBufSize)

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(grpcx.TenantInterceptor),
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	)

	return srv, lis
}
