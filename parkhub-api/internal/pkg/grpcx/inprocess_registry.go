package grpcx

import (
	"context"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

// GetBufconnDialer returns a grpc.DialOption that routes calls through the
// provided in-process bufconn.Listener instead of the network.
//
// Usage (Phase 1 domain client construction):
//
//	conn, err := grpc.NewClient("passthrough://bufnet",
//	    grpcx.GetBufconnDialer(lis),
//	    grpc.WithTransportCredentials(insecure.NewCredentials()),
//	)
func GetBufconnDialer(lis *bufconn.Listener) grpc.DialOption {
	return grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
		return lis.DialContext(ctx)
	})
}

// NewInProcessConn creates a gRPC client connection to the given bufconn
// listener. Use this in Phase 1 when wiring domain-to-domain calls.
func NewInProcessConn(_ context.Context, lis *bufconn.Listener) (*grpc.ClientConn, error) {
	return grpc.NewClient(
		"passthrough://bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return lis.DialContext(ctx)
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
}
