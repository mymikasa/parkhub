#!/bin/bash
# Integration tests for parking lot API endpoints
# Requires: running API server at localhost:8080
# Usage: bash tests/integration/parking_lot_api_test.sh

set -euo pipefail

BASE_URL="http://localhost:8080/api/v1"
PASSED=0
FAILED=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_status() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    TOTAL=$((TOTAL + 1))
    if [ "$actual" -eq "$expected" ]; then
        echo -e "${GREEN}✓${NC} $test_name (HTTP $actual)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name (expected HTTP $expected, got $actual)"
        FAILED=$((FAILED + 1))
    fi
}

assert_json() {
    local test_name="$1"
    local py_expr="$2"
    local expected="$3"
    local body="$4"
    TOTAL=$((TOTAL + 1))
    local actual
    actual=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print($py_expr)" 2>/dev/null || echo "PARSE_ERROR")
    if [ "$actual" = "$expected" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name (expected '$expected', got '$actual')"
        FAILED=$((FAILED + 1))
    fi
}

# Helper: make HTTP request, capture body and status
request() {
    local resp
    resp=$(curl -s -w "\n%{http_code}" "$@")
    REQ_STATUS=$(echo "$resp" | tail -1)
    REQ_BODY=$(echo "$resp" | sed '$d')
}

echo "============================================"
echo " Parking Lot API Integration Tests"
echo "============================================"
echo ""

# --- Setup: Get tokens ---
echo -e "${YELLOW}[Setup] Authenticating...${NC}"

# Tenant admin token
request "$BASE_URL/auth/login" -H "Content-Type: application/json" \
    -d '{"account":"lis","password":"1234qwerQWER"}'
if [ "$REQ_STATUS" -ne 200 ]; then
    echo -e "${RED}Failed to authenticate as tenant_admin. Aborting.${NC}"
    exit 1
fi
TOKEN=$(echo "$REQ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "  tenant_admin token OK"

# Platform admin token
request "$BASE_URL/auth/login" -H "Content-Type: application/json" \
    -d '{"account":"platform_admin","password":"Admin@123"}'
PLATFORM_TOKEN=""
if [ "$REQ_STATUS" -eq 200 ]; then
    PLATFORM_TOKEN=$(echo "$REQ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
    echo "  platform_admin token OK"
else
    echo -e "  ${YELLOW}platform_admin auth failed, skipping permission tests${NC}"
fi
echo ""

# ==========================================
echo -e "${YELLOW}[1] Parking Lot CRUD${NC}"
# ==========================================

# List
request "$BASE_URL/parking-lots" -H "Authorization: Bearer $TOKEN"
assert_status "GET /parking-lots returns 200" 200 "$REQ_STATUS"

# Stats
request "$BASE_URL/parking-lots/stats" -H "Authorization: Bearer $TOKEN"
assert_status "GET /parking-lots/stats returns 200" 200 "$REQ_STATUS"

# Create
request "$BASE_URL/parking-lots" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"集成测试停车场XYZ","address":"北京市朝阳区集成测试地址001号","total_spaces":100,"lot_type":"underground"}'
assert_status "POST /parking-lots creates lot (201)" 201 "$REQ_STATUS"
LOT_ID=$(echo "$REQ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

if [ -z "$LOT_ID" ]; then
    echo -e "${RED}Failed to extract lot ID from: $REQ_BODY${NC}"
    exit 1
fi
echo "  Created lot: $LOT_ID"

# Duplicate name
request "$BASE_URL/parking-lots" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"集成测试停车场XYZ","address":"北京市海淀区另一个地址号","total_spaces":50,"lot_type":"ground"}'
assert_status "POST /parking-lots duplicate name returns 409" 409 "$REQ_STATUS"

# Get by ID
request "$BASE_URL/parking-lots/$LOT_ID" -H "Authorization: Bearer $TOKEN"
assert_status "GET /parking-lots/:id returns 200" 200 "$REQ_STATUS"
assert_json "  name is correct" "d['data']['name']" "集成测试停车场XYZ" "$REQ_BODY"
assert_json "  status is active" "d['data']['status']" "active" "$REQ_BODY"

# Update
request "$BASE_URL/parking-lots/$LOT_ID" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"集成测试停车场(改)","address":"北京市朝阳区新测试地址","total_spaces":150,"lot_type":"ground","status":"active"}'
assert_status "PUT /parking-lots/:id returns 200" 200 "$REQ_STATUS"
assert_json "  name updated" "d['data']['name']" "集成测试停车场(改)" "$REQ_BODY"

# Status change
request "$BASE_URL/parking-lots/$LOT_ID" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"集成测试停车场(改)","address":"北京市朝阳区新测试地址","total_spaces":150,"lot_type":"ground","status":"inactive"}'
assert_status "PUT /parking-lots/:id status→inactive returns 200" 200 "$REQ_STATUS"
assert_json "  status is inactive" "d['data']['status']" "inactive" "$REQ_BODY"

echo ""

# ==========================================
echo -e "${YELLOW}[2] Gate CRUD${NC}"
# ==========================================

# Create entry gate
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"东入口","type":"entry"}'
assert_status "POST gates: create entry gate (201)" 201 "$REQ_STATUS"
ENTRY_GATE_ID=$(echo "$REQ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

# Create exit gate
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"西出口","type":"exit"}'
assert_status "POST gates: create exit gate (201)" 201 "$REQ_STATUS"
EXIT_GATE_ID=$(echo "$REQ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

# Create second entry gate (for delete test)
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"南入口","type":"entry"}'
assert_status "POST gates: create second entry gate (201)" 201 "$REQ_STATUS"
ENTRY_GATE2_ID=$(echo "$REQ_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

# Duplicate gate name
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"东入口","type":"entry"}'
assert_status "POST gates: duplicate name returns 409" 409 "$REQ_STATUS"

# List gates
request "$BASE_URL/parking-lots/$LOT_ID/gates" -H "Authorization: Bearer $TOKEN"
assert_status "GET gates: list returns 200" 200 "$REQ_STATUS"

# Update gate
if [ -n "$ENTRY_GATE_ID" ]; then
    request "$BASE_URL/gates/$ENTRY_GATE_ID" -X PUT \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"东入口(改)"}'
    assert_status "PUT /gates/:id updates gate" 200 "$REQ_STATUS"
    assert_json "  gate name updated" "d['data']['name']" "东入口(改)" "$REQ_BODY"
fi

# Delete second entry gate (should succeed)
if [ -n "$ENTRY_GATE2_ID" ]; then
    request "$BASE_URL/gates/$ENTRY_GATE2_ID" -X DELETE \
        -H "Authorization: Bearer $TOKEN"
    assert_status "DELETE /gates/:id second entry (200)" 200 "$REQ_STATUS"
fi

# Delete last entry gate (should fail with 403)
if [ -n "$ENTRY_GATE_ID" ]; then
    request "$BASE_URL/gates/$ENTRY_GATE_ID" -X DELETE \
        -H "Authorization: Bearer $TOKEN"
    assert_status "DELETE /gates/:id last entry returns 403" 403 "$REQ_STATUS"
fi

echo ""

# ==========================================
echo -e "${YELLOW}[3] Auth & Permission${NC}"
# ==========================================

# No auth
request "$BASE_URL/parking-lots"
assert_status "GET /parking-lots no auth returns 401" 401 "$REQ_STATUS"

# Platform admin: read OK
if [ -n "$PLATFORM_TOKEN" ]; then
    request "$BASE_URL/parking-lots" -H "Authorization: Bearer $PLATFORM_TOKEN"
    assert_status "GET /parking-lots as platform_admin returns 200" 200 "$REQ_STATUS"

    # Platform admin: write forbidden
    request "$BASE_URL/parking-lots" \
        -H "Authorization: Bearer $PLATFORM_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"不允许创建的车场","address":"北京市某区某街道某号","total_spaces":10,"lot_type":"ground"}'
    assert_status "POST /parking-lots as platform_admin returns 403" 403 "$REQ_STATUS"
fi

echo ""

# ==========================================
echo -e "${YELLOW}[4] Search${NC}"
# ==========================================

request "$BASE_URL/parking-lots?search=集成测试" -H "Authorization: Bearer $TOKEN"
assert_status "GET /parking-lots?search=集成测试 returns 200" 200 "$REQ_STATUS"

echo ""

# ==========================================
echo -e "${YELLOW}[Cleanup] Deleting test data...${NC}"
# ==========================================

# Delete remaining gates first (exit gate)
if [ -n "$EXIT_GATE_ID" ]; then
    # Need second exit to delete this one - just leave it, cascade will handle
    true
fi

# Delete parking lot (cascade deletes gates)
request "$BASE_URL/parking-lots/$LOT_ID" -X DELETE \
    -H "Authorization: Bearer $TOKEN"
assert_status "DELETE /parking-lots/:id cleanup (200)" 200 "$REQ_STATUS"

# Verify deletion
request "$BASE_URL/parking-lots/$LOT_ID" -H "Authorization: Bearer $TOKEN"
assert_status "GET /parking-lots/:id after delete returns 404" 404 "$REQ_STATUS"

# ==========================================
echo ""
echo "============================================"
if [ "$FAILED" -eq 0 ]; then
    echo -e " ${GREEN}All tests passed!${NC} ($PASSED/$TOTAL)"
else
    echo -e " Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, $TOTAL total"
fi
echo "============================================"

exit "$FAILED"
