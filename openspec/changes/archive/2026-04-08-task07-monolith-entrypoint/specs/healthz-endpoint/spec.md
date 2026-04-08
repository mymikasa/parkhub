## ADDED Requirements

### Requirement: /healthz endpoint availability
The system SHALL expose an HTTP `GET /healthz` endpoint on the same port as the monolith's HTTP server. The endpoint SHALL NOT require authentication.

#### Scenario: Endpoint reachable after startup
- **WHEN** the monolith has started successfully
- **THEN** `curl http://localhost:8080/healthz` returns HTTP 200

#### Scenario: Endpoint requires no auth
- **WHEN** a request is sent without Authorization header
- **THEN** the response is 200 (or 503 if degraded) — never 401 or 403

### Requirement: Concurrent database health check
`GET /healthz` SHALL concurrently Ping all 5 database connection pools and report results. The check SHALL complete within 3 seconds; any pool that has not responded within that time SHALL be reported as unhealthy.

#### Scenario: All databases healthy
- **WHEN** all 5 databases are reachable
- **THEN** response is `{"status":"ok","databases":{"core":"ok","iot":"ok","event":"ok","billing":"ok","payment":"ok"}}` with HTTP 200

#### Scenario: One database unhealthy
- **WHEN** the `billing` database Ping fails or times out
- **THEN** response is `{"status":"degraded","databases":{"core":"ok","iot":"ok","event":"ok","billing":"error: <message>","payment":"ok"}}` with HTTP 503

#### Scenario: Health check completes within 3 seconds
- **WHEN** a database takes longer than 3 seconds to respond
- **THEN** it is marked as `"error: timeout"` and the response is returned within 3 seconds total

### Requirement: Response Content-Type is application/json
`GET /healthz` SHALL always return `Content-Type: application/json`, regardless of the health status.

#### Scenario: Healthy response Content-Type
- **WHEN** all databases are healthy
- **THEN** the response includes `Content-Type: application/json` header

#### Scenario: Degraded response Content-Type
- **WHEN** any database is unhealthy
- **THEN** the response still includes `Content-Type: application/json` header

### Requirement: /healthz excluded from OTel tracing
`GET /healthz` SHALL NOT generate OTel trace spans. High-frequency polling by K8s probes would otherwise pollute traces with noise.

#### Scenario: Health check not traced
- **WHEN** `/healthz` is called 10 times in rapid succession
- **THEN** no spans with `http.route=/healthz` appear in the trace exporter output
