#!/bin/sh
set -e

EMQX_HOST="${EMQX_HOST:-localhost}"
EMQX_API_PORT="${EMQX_API_PORT:-18083}"
API_KEY="${API_KEY:-parkhub-init}"
API_SECRET="${API_SECRET:-parkhub-init-secret}"
BACKEND_USER="${BACKEND_USER:-backend_service}"
BACKEND_PASS="${BACKEND_PASS:-backend_secret}"
AUTHENTICATOR_ID="password_based%3Abuilt_in_database"
API_BASE="http://${EMQX_HOST}:${EMQX_API_PORT}/api/v5"

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

fail_with_response() {
    message="$1"
    echo "ERROR: ${message}"
    cat /tmp/response.json 2>/dev/null || true
    exit 1
}

api_request() {
    method="$1"
    path="$2"
    data="$3"

    if [ -n "$data" ]; then
        curl -s -w "%{http_code}" -o /tmp/response.json \
            -X "$method" "${API_BASE}${path}" \
            -u "${API_KEY}:${API_SECRET}" \
            -H "Content-Type: application/json" \
            -d "$data"
        return
    fi

    curl -s -w "%{http_code}" -o /tmp/response.json \
        -X "$method" "${API_BASE}${path}" \
        -u "${API_KEY}:${API_SECRET}" \
        -H "Content-Type: application/json"
}

ensure_authenticator() {
    echo "Ensuring built-in database authenticator..."

    payload='{
        "backend": "built_in_database",
        "mechanism": "password_based",
        "password_hash_algorithm": {
            "name": "sha256",
            "salt_position": "suffix"
        },
        "user_id_type": "username"
    }'

    response=$(api_request PUT "/authentication/${AUTHENTICATOR_ID}" "$payload")

    if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "204" ]; then
        echo "Authenticator is configured."
        return
    fi

    if [ "$response" = "404" ]; then
        response=$(api_request POST "/authentication" "$payload")
        if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "204" ]; then
            echo "Authenticator created successfully!"
            return
        fi
    fi

    if [ "$response" = "401" ]; then
        fail_with_response "EMQX HTTP API credentials are invalid. Check EMQX_API_KEY/EMQX_API_SECRET and confirm the bootstrap API key file is mounted into the broker."
    fi

    fail_with_response "failed to configure authenticator (HTTP ${response})"
}

ensure_backend_user() {
    echo "Ensuring backend superuser: ${BACKEND_USER}"

    create_payload="{
        \"user_id\": \"${BACKEND_USER}\",
        \"password\": \"${BACKEND_PASS}\",
        \"is_superuser\": true
    }"

    update_payload="{
        \"password\": \"${BACKEND_PASS}\",
        \"is_superuser\": true
    }"

    response=$(api_request POST "/authentication/${AUTHENTICATOR_ID}/users" "$create_payload")

    if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "204" ]; then
        echo "Backend user created successfully!"
        return
    fi

    if [ "$response" = "400" ] || [ "$response" = "404" ] || [ "$response" = "409" ]; then
        response=$(api_request PUT "/authentication/${AUTHENTICATOR_ID}/users/${BACKEND_USER}" "$update_payload")
        if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "204" ]; then
            echo "Backend user updated successfully!"
            return
        fi
    fi

    if [ "$response" = "401" ]; then
        fail_with_response "EMQX HTTP API credentials are invalid. Check EMQX_API_KEY/EMQX_API_SECRET and confirm the bootstrap API key file is mounted into the broker."
    fi

    fail_with_response "failed to create or update backend user (HTTP ${response})"
}

configure_acl() {
    echo "Configuring ACL authorization rules..."

    response=$(api_request POST "/authorization/sources" '{
        "type": "file",
        "enable": true,
        "rules": [
            {
                "permission": "allow",
                "action": "publish",
                "topic": "device/${clientid}/heartbeat"
            },
            {
                "permission": "allow",
                "action": "subscribe",
                "topic": "device/${clientid}/command"
            },
            {
                "permission": "deny",
                "action": "subscribe",
                "topic": "device/+"
            },
            {
                "permission": "deny",
                "action": "publish",
                "topic": "device/+/command"
            }
        ]
    }')

    if [ "$response" = "201" ] || [ "$response" = "200" ] || [ "$response" = "204" ]; then
        echo "ACL rules configured successfully!"
    elif [ "$response" = "400" ]; then
        echo "ACL rules may already exist, continuing..."
    elif [ "$response" = "401" ]; then
        fail_with_response "EMQX HTTP API credentials are invalid. Check EMQX_API_KEY/EMQX_API_SECRET and confirm the bootstrap API key file is mounted into the broker."
    else
        fail_with_response "failed to configure ACL (HTTP ${response})"
    fi
}

main() {
    wait_for_emqx
    ensure_authenticator
    ensure_backend_user
    configure_acl
    echo "EMQX initialization complete!"
}

main "$@"
