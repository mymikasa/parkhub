package otelx

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
)

// failingHandler simulates the OTel bridge when the Collector is unreachable:
// it accepts every record but returns an error from Handle.
type failingHandler struct {
	calls int
}

func (h *failingHandler) Enabled(context.Context, slog.Level) bool { return true }
func (h *failingHandler) Handle(context.Context, slog.Record) error {
	h.calls++
	return errors.New("collector unreachable")
}
func (h *failingHandler) WithAttrs([]slog.Attr) slog.Handler { return h }
func (h *failingHandler) WithGroup(string) slog.Handler      { return h }

// TestFanoutLocalSurvivesRemoteFailure is the regression test for the P1
// review comment: when the OTel exporter fails, the local stdout handler
// must still receive the log so on-host troubleshooting works.
func TestFanoutLocalSurvivesRemoteFailure(t *testing.T) {
	var buf bytes.Buffer
	local := slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
	remote := &failingHandler{}

	logger := slog.New(newFanoutHandler(local, remote))
	logger.Info("hello fanout", "k", "v")

	if !strings.Contains(buf.String(), "hello fanout") {
		t.Fatalf("local handler did not receive record: %q", buf.String())
	}
	if remote.calls != 1 {
		t.Fatalf("remote handler called %d times, want 1", remote.calls)
	}
}

func TestFanoutWithAttrsAppliesToAllDownstreams(t *testing.T) {
	var bufA, bufB bytes.Buffer
	a := slog.NewTextHandler(&bufA, nil)
	b := slog.NewTextHandler(&bufB, nil)

	logger := slog.New(newFanoutHandler(a, b)).With("tenant", "t1")
	logger.Info("hi")

	for name, buf := range map[string]*bytes.Buffer{"a": &bufA, "b": &bufB} {
		if !strings.Contains(buf.String(), `tenant=t1`) {
			t.Fatalf("handler %s missing With attr: %q", name, buf.String())
		}
	}
}

func TestFanoutEnabledIsUnionAcrossHandlers(t *testing.T) {
	debugOnly := slog.NewTextHandler(&bytes.Buffer{}, &slog.HandlerOptions{Level: slog.LevelDebug})
	errorOnly := slog.NewTextHandler(&bytes.Buffer{}, &slog.HandlerOptions{Level: slog.LevelError})

	h := newFanoutHandler(debugOnly, errorOnly)
	if !h.Enabled(context.Background(), slog.LevelDebug) {
		t.Fatal("fanout should be enabled at Debug because debugOnly accepts it")
	}
	if !h.Enabled(context.Background(), slog.LevelError) {
		t.Fatal("fanout should be enabled at Error because both accept it")
	}
}

func TestFanoutNilHandlersDropped(t *testing.T) {
	var buf bytes.Buffer
	local := slog.NewTextHandler(&buf, nil)

	h := newFanoutHandler(nil, local, nil).(*fanoutHandler)
	if got := len(h.handlers); got != 1 {
		t.Fatalf("fanout retained %d handlers, want 1 (nils dropped)", got)
	}
}
