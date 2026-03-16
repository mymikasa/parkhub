## ADDED Requirements

### Requirement: Handler errors resolved via domain error codes
HTTP handlers SHALL use `errors.As` to unwrap `domain.DomainError` and map `ErrCode` values to HTTP status codes. String matching on error messages is prohibited.

#### Scenario: Invalid credentials error
- **WHEN** `AuthService.Login` returns a `DomainError` with code `INVALID_CREDENTIALS`
- **THEN** handler returns HTTP 401 with `{"code": "INVALID_CREDENTIALS", "message": "..."}`

#### Scenario: Token expired error
- **WHEN** `AuthService.RefreshToken` returns a `DomainError` with code `TOKEN_EXPIRED`
- **THEN** handler returns HTTP 401 with `{"code": "TOKEN_EXPIRED", "message": "..."}`

#### Scenario: Permission denied error
- **WHEN** a service returns a `DomainError` with code `PERMISSION_DENIED`
- **THEN** handler returns HTTP 403 with the corresponding error body

#### Scenario: Unknown error
- **WHEN** a service returns an error that is not a `DomainError`
- **THEN** handler returns HTTP 500 with `{"code": "INTERNAL_ERROR", "message": "internal server error"}` and logs the original error at ERROR level

### Requirement: Consistent error response format
All error responses from the API SHALL use a uniform JSON structure with `code` (string) and `message` (string) fields.

#### Scenario: Any API error
- **WHEN** any handler returns an error response
- **THEN** the response body is `{"code": "<ERROR_CODE>", "message": "<human readable>"}` with appropriate HTTP status code
