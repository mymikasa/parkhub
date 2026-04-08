## ADDED Requirements

### Requirement: OpenTelemetry TracerProvider initialization
The system SHALL initialize an OTel `TracerProvider` at startup that propagates trace context across in-process gRPC calls and outbound database queries. The provider SHALL be registered as the global provider via `otel.SetTracerProvider`.

#### Scenario: TracerProvider registered as global
- **WHEN** the monolith starts
- **THEN** `otel.GetTracerProvider()` returns the configured provider (not the no-op default)

#### Scenario: Spans emitted for HTTP requests
- **WHEN** a request to `/healthz` is processed
- **THEN** a trace span with `http.method=GET` and `http.route=/healthz` is exported

### Requirement: OpenTelemetry MeterProvider initialization
The system SHALL initialize an OTel `MeterProvider` and register it as the global meter provider via `otel.SetMeterProvider`. Go runtime metrics (goroutines, GC, memory) SHALL be collected automatically using `go.opentelemetry.io/contrib/instrumentation/runtime`.

#### Scenario: MeterProvider registered as global
- **WHEN** the monolith starts
- **THEN** `otel.GetMeterProvider()` returns the configured provider (not the no-op default)

#### Scenario: Runtime metrics collected
- **WHEN** the monolith has been running for 10 seconds
- **THEN** at least one metric with name `runtime.go.goroutines` is observable in the exporter

### Requirement: Environment-driven exporter selection
The system SHALL select the OTel exporter based on the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable:
- If set: use OTLP gRPC exporter pointing to that endpoint
- If not set: fall back to stdout exporter (for local development / CI)

#### Scenario: OTLP endpoint configured
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` is set
- **THEN** spans are exported via OTLP gRPC to `localhost:4317`

#### Scenario: No OTLP endpoint
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is not set
- **THEN** spans are printed to stdout in human-readable format and no connection to an external collector is attempted

### Requirement: OTel SDK shutdown on process exit
The OTel SDK (`TracerProvider.Shutdown` and `MeterProvider.Shutdown`) SHALL be called as the last step of the graceful shutdown sequence, after all database pools are closed, with a 5-second deadline.

#### Scenario: SDK flushes pending spans on shutdown
- **WHEN** SIGTERM is received and there are buffered spans not yet exported
- **THEN** `TracerProvider.Shutdown` flushes all pending spans before the process exits

#### Scenario: SDK shutdown timeout respected
- **WHEN** the OTLP collector is unreachable during shutdown
- **THEN** `TracerProvider.Shutdown` returns after 5 seconds and the process exits regardless
