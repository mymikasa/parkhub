package tenant

import (
	"context"
	"testing"
)

func TestWithContext_Success(t *testing.T) {
	want := TenantInfo{
		TenantID:        "t-001",
		UserRole:        "tenant_admin",
		IsPlatformAdmin: false,
		UserID:          "u-001",
	}
	ctx := WithContext(context.Background(), want)

	got, ok := FromContext(ctx)
	if !ok {
		t.Fatal("FromContext returned false")
	}
	if got != want {
		t.Errorf("got %+v, want %+v", got, want)
	}
}

func TestFromContext_Missing(t *testing.T) {
	_, ok := FromContext(context.Background())
	if ok {
		t.Fatal("expected ok=false for empty context")
	}
}

func TestMustFromContext_Success(t *testing.T) {
	want := TenantInfo{TenantID: "t-001", UserRole: "operator"}
	ctx := WithContext(context.Background(), want)

	got := MustFromContext(ctx)
	if got != want {
		t.Errorf("got %+v, want %+v", got, want)
	}
}

func TestMustFromContext_Panic(t *testing.T) {
	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic")
		}
		msg, ok := r.(string)
		if !ok {
			t.Fatalf("panic value is not string: %v", r)
		}
		if msg != "tenant: context missing — all db queries require tenant info" {
			t.Fatalf("unexpected panic message: %s", msg)
		}
	}()

	MustFromContext(context.Background())
}

func TestWithContext_ValueType(t *testing.T) {
	original := TenantInfo{TenantID: "t-001", UserRole: "tenant_admin"}
	ctx := WithContext(context.Background(), original)

	// Mutate original — should not affect stored value
	original.TenantID = "t-999"

	got, _ := FromContext(ctx)
	if got.TenantID != "t-001" {
		t.Errorf("value type protection failed: got %s, want t-001", got.TenantID)
	}
}
