package otelx

import (
	"context"
	"errors"
	"log/slog"
)

// fanoutHandler dispatches each slog record to multiple downstream handlers.
//
// Used to tee logs into both a local stdout/stderr handler and the OTel
// LoggerProvider bridge: when the OTel Collector is unreachable the OTLP
// log exporter silently drops records, but the local handler still produces
// stdout output usable for on-host troubleshooting.
type fanoutHandler struct {
	handlers []slog.Handler
}

func newFanoutHandler(handlers ...slog.Handler) slog.Handler {
	hs := make([]slog.Handler, 0, len(handlers))
	for _, h := range handlers {
		if h != nil {
			hs = append(hs, h)
		}
	}
	return &fanoutHandler{handlers: hs}
}

func (f *fanoutHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range f.handlers {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (f *fanoutHandler) Handle(ctx context.Context, r slog.Record) error {
	var errs error
	for _, h := range f.handlers {
		if !h.Enabled(ctx, r.Level) {
			continue
		}
		// Clone() so each handler gets an independent copy; otherwise
		// downstream WithAttrs/grouping mutations would race.
		if err := h.Handle(ctx, r.Clone()); err != nil {
			errs = errors.Join(errs, err)
		}
	}
	return errs
}

func (f *fanoutHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	hs := make([]slog.Handler, len(f.handlers))
	for i, h := range f.handlers {
		hs[i] = h.WithAttrs(attrs)
	}
	return &fanoutHandler{handlers: hs}
}

func (f *fanoutHandler) WithGroup(name string) slog.Handler {
	hs := make([]slog.Handler, len(f.handlers))
	for i, h := range f.handlers {
		hs[i] = h.WithGroup(name)
	}
	return &fanoutHandler{handlers: hs}
}
