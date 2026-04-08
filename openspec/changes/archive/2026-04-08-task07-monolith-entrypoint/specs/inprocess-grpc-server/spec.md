## ADDED Requirements

### Requirement: In-process gRPC server initialization
The system SHALL initialize a `*grpc.Server` instance within `cmd/monolith` with the tenant interceptor and OTel trace propagation interceptor pre-installed. No gRPC services SHALL be registered in Task 0.7 (registration is the responsibility of each domain in Phase 1).

#### Scenario: gRPC server created with interceptors
- **WHEN** the monolith starts
- **THEN** a `*grpc.Server` is created with `UnaryInterceptor(tenantInterceptor)` and `UnaryInterceptor(otelgrpc.UnaryServerInterceptor())` in a chain

#### Scenario: No gRPC services registered
- **WHEN** a gRPC reflection request is sent to the server
- **THEN** the server responds with an empty service list (no registered services)

### Requirement: In-process transport via bufconn
The gRPC server SHALL listen on an in-memory `bufconn.Listener` (not a TCP port) in the monolith process. Domain services in Phase 1 SHALL obtain clients by dialing the same bufconn, achieving zero-copy in-process calls without occupying a network port.

#### Scenario: In-process call via bufconn
- **WHEN** a domain client dials the bufconn listener using `grpc.WithContextDialer`
- **THEN** the call is dispatched to the registered handler without any network hop

#### Scenario: No external port exposed
- **WHEN** the monolith is running
- **THEN** no TCP port is bound for gRPC traffic (`netstat` shows no additional open port beyond the HTTP port)

### Requirement: Graceful stop on shutdown
The gRPC server SHALL be stopped via `GracefulStop()` as part of the ordered shutdown sequence, after the HTTP server has been shut down. In-flight RPCs SHALL be allowed to complete before the server stops.

#### Scenario: GracefulStop during in-flight RPC
- **WHEN** SIGTERM is received while an in-process RPC is executing
- **THEN** the RPC completes before the gRPC server returns from `GracefulStop()`

#### Scenario: GracefulStop within shutdown deadline
- **WHEN** SIGTERM is received and no RPCs are in flight
- **THEN** `GracefulStop()` returns immediately and shutdown proceeds to the next step
