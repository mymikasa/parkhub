#!/bin/sh
set -e

EMQX_HOST="${EMQX_HOST:-localhost}"
EMQX_API_PORT="${EMQX_API_PORT:-18083}"
DASHBOARD_USER="${DASHBOARD_USER:-admin}"
DASHBOARD_PASS="${DASHBOARD_PASS:-public}"
BACKEND_USER="${BACKEND_USER:-backend_service}"
BACKEND_PASS="${BACKEND_PASS:-backend_secret}"

wait_for_emqx() {
    echo "Waiting for EMQX to be ready..."
    max_attempts=30
    attempt=0
    until curl -s "http://${EMQX_HOST}:${EMQX_API_PORT}/api/v5/status" > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo "EMQX not ready after $max_attempts attempts"
            exit 1
        fi
        sleep 2
    done
    echo "EMQX is ready!"
}

create_backend_user() {
    echo "Creating backend superuser: ${BACKEND_USER}"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X POST "http://${EMQX_HOST}:${EMQX_API_PORT}/api/v5/authentication/password_based:built_in_database/users" \
        -u "${DASHBOARD_USER}:${DASHBOARD_PASS}" \
        -H "Content-Type: application/json" \
        -d "{
            \"user_id\": \"${BACKEND_USER}\",
            \"password\": \"${BACKEND_PASS}\",
            \"is_superuser\": true
        }")
    
    if [ "$response" = "201" ] || [ "$response" = "200" ]; then
        echo "Backend user created successfully!"
    elif [ "$response" = "400" ]; then
        echo "Backend user already exists, continuing..."
    else
        echo "Warning: Failed to create backend user (HTTP $response)"
    fi
}

main() {
    wait_for_emqx
    create_backend_user
    echo "EMQX initialization complete!"
}

main "$@"
