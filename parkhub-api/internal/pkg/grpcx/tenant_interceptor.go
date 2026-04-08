package grpcx

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	"github.com/parkhub/api/internal/pkg/tenant"
)

const (
	// HeaderTenantID is the gRPC metadata key for tenant ID.
	// Injected by APISIX Gateway or BFF after JWT parsing.
	HeaderTenantID = "x-tenant-id"

	// HeaderUserRole is the gRPC metadata key for user role.
	HeaderUserRole = "x-user-role"

	// HeaderUserID is the gRPC metadata key for user ID.
	HeaderUserID = "x-user-id"
)

// TenantInterceptor is a grpc.UnaryServerInterceptor that injects
// TenantInfo into the request context from gRPC metadata headers.
//
// This interceptor only injects — it does NOT reject. RBAC enforcement
// is handled by a separate interceptor downstream.
func TenantInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		md = metadata.New(nil)
	}

	role := firstValue(md, HeaderUserRole)

	tenantInfo := tenant.TenantInfo{
		TenantID:        firstValue(md, HeaderTenantID),
		UserRole:        role,
		UserID:          firstValue(md, HeaderUserID),
		IsPlatformAdmin: role == "platform_admin",
	}

	ctx = tenant.WithContext(ctx, tenantInfo)
	return handler(ctx, req)
}

// firstValue returns the first value for the given metadata key, or "".
func firstValue(md metadata.MD, key string) string {
	vals := md.Get(key)
	if len(vals) == 0 {
		return ""
	}
	return vals[0]
}
