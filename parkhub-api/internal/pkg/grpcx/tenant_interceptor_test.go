package grpcx

import (
	"context"
	"testing"

	"google.golang.org/grpc/metadata"

	"github.com/parkhub/api/internal/pkg/tenant"
)

func TestTenantInterceptor_NormalUser(t *testing.T) {
	want := tenant.TenantInfo{
		TenantID:        "T1",
		UserRole:        "tenant_admin",
		IsPlatformAdmin: false,
		UserID:          "U1",
	}

	md := metadata.New(map[string]string{
		HeaderTenantID: "T1",
		HeaderUserRole: "tenant_admin",
		HeaderUserID:   "U1",
	})
	ctx := metadata.NewIncomingContext(context.Background(), md)

	_, err := TenantInterceptor(ctx, nil, nil, func(ctx context.Context, req any) (any, error) {
		info, ok := tenant.FromContext(ctx)
		if !ok {
			t.Fatal("TenantInfo missing from context")
		}
		if info != want {
			t.Errorf("got %+v, want %+v", info, want)
		}
		return nil, nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTenantInterceptor_PlatformAdmin(t *testing.T) {
	want := tenant.TenantInfo{
		TenantID:        "",
		UserRole:        "platform_admin",
		IsPlatformAdmin: true,
		UserID:          "U2",
	}

	md := metadata.New(map[string]string{
		HeaderUserRole: "platform_admin",
		HeaderUserID:   "U2",
	})
	ctx := metadata.NewIncomingContext(context.Background(), md)

	_, err := TenantInterceptor(ctx, nil, nil, func(ctx context.Context, req any) (any, error) {
		info, ok := tenant.FromContext(ctx)
		if !ok {
			t.Fatal("TenantInfo missing from context")
		}
		if info != want {
			t.Errorf("got %+v, want %+v", info, want)
		}
		return nil, nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTenantInterceptor_Operator(t *testing.T) {
	want := tenant.TenantInfo{
		TenantID:        "T2",
		UserRole:        "operator",
		IsPlatformAdmin: false,
		UserID:          "U3",
	}

	md := metadata.New(map[string]string{
		HeaderTenantID: "T2",
		HeaderUserRole: "operator",
		HeaderUserID:   "U3",
	})
	ctx := metadata.NewIncomingContext(context.Background(), md)

	_, err := TenantInterceptor(ctx, nil, nil, func(ctx context.Context, req any) (any, error) {
		info, ok := tenant.FromContext(ctx)
		if !ok {
			t.Fatal("TenantInfo missing from context")
		}
		if info != want {
			t.Errorf("got %+v, want %+v", info, want)
		}
		return nil, nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestTenantInterceptor_NoMetadata(t *testing.T) {
	want := tenant.TenantInfo{
		TenantID:        "",
		UserRole:        "",
		IsPlatformAdmin: false,
		UserID:          "",
	}

	// No metadata at all — interceptor injects zero-value, does not reject.
	ctx := context.Background()

	_, err := TenantInterceptor(ctx, nil, nil, func(ctx context.Context, req any) (any, error) {
		info, ok := tenant.FromContext(ctx)
		if !ok {
			t.Fatal("TenantInfo missing from context")
		}
		if info != want {
			t.Errorf("got %+v, want %+v", info, want)
		}
		return nil, nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
