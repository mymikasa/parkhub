package tenant

import "context"

type ctxKey struct{}

// TenantInfo stores tenant context extracted from gRPC metadata.
// Injected by the tenant interceptor, consumed by BaseRepo.WithTenant().
type TenantInfo struct {
	// TenantID is the tenant UUID. Empty for platform admins.
	TenantID string

	// UserRole: platform_admin / tenant_admin / operator.
	UserRole string

	// IsPlatformAdmin bypasses tenant_id filtering when true.
	IsPlatformAdmin bool

	// UserID for audit logging.
	UserID string
}

// FromContext extracts TenantInfo from context.
// Returns (TenantInfo, true) when present, (zero value, false) otherwise.
func FromContext(ctx context.Context) (TenantInfo, bool) {
	info, ok := ctx.Value(ctxKey{}).(TenantInfo)
	return info, ok
}

// WithContext injects TenantInfo into context.
// Called by gRPC interceptor; business code should not call this directly.
func WithContext(ctx context.Context, info TenantInfo) context.Context {
	return context.WithValue(ctx, ctxKey{}, info)
}

// MustFromContext extracts TenantInfo or panics.
// Use in Repository layer: missing tenant context is a programming error
// that should surface during development, not silently pass.
func MustFromContext(ctx context.Context) TenantInfo {
	info, ok := FromContext(ctx)
	if !ok {
		panic("tenant: context missing — all db queries require tenant info")
	}
	return info
}
