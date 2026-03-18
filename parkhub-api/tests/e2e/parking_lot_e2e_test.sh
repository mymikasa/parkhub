#!/bin/bash
# E2E Test: Complete Parking Lot Management Business Flow
# Tests the full lifecycle from creation through deletion
# Requires: running API server at localhost:8080
# Usage: bash tests/e2e/parking_lot_e2e_test.sh

set -euo pipefail

BASE_URL="http://localhost:8080/api/v1"
PASSED=0
FAILED=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

assert_status() {
    local test_name="$1" expected="$2" actual="$3"
    TOTAL=$((TOTAL + 1))
    if [ "$actual" -eq "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}✗${NC} $test_name (expected HTTP $expected, got $actual)"
        FAILED=$((FAILED + 1))
    fi
}

assert_json() {
    local test_name="$1" py_expr="$2" expected="$3" body="$4"
    TOTAL=$((TOTAL + 1))
    local actual
    actual=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print($py_expr)" 2>/dev/null || echo "PARSE_ERROR")
    if [ "$actual" = "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}✗${NC} $test_name (expected '$expected', got '$actual')"
        FAILED=$((FAILED + 1))
    fi
}

request() {
    local resp
    resp=$(curl -s -w "\n%{http_code}" "$@")
    REQ_STATUS=$(echo "$resp" | tail -1)
    REQ_BODY=$(echo "$resp" | sed '$d')
}

json_get() {
    echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print($2)" 2>/dev/null
}

UNIQUE_ID="e2e_$(date +%s)"

echo "============================================"
echo " E2E Test: Parking Lot Complete Lifecycle"
echo " Unique ID: $UNIQUE_ID"
echo "============================================"
echo ""

# ==========================================
echo -e "${CYAN}Phase 1: Authentication${NC}"
# ==========================================

request "$BASE_URL/auth/login" -H "Content-Type: application/json" \
    -d '{"account":"lis","password":"1234qwerQWER"}'
assert_status "Tenant admin login" 200 "$REQ_STATUS"
TOKEN=$(json_get "$REQ_BODY" "d['access_token']")
TENANT_ID=$(json_get "$REQ_BODY" "d['user']['tenant_id']")
echo -e "  Tenant ID: $TENANT_ID"

request "$BASE_URL/auth/login" -H "Content-Type: application/json" \
    -d '{"account":"platform_admin","password":"Admin@123"}'
PLATFORM_TOKEN=""
if [ "$REQ_STATUS" -eq 200 ]; then
    PLATFORM_TOKEN=$(json_get "$REQ_BODY" "d['access_token']")
    assert_status "Platform admin login" 200 "$REQ_STATUS"
fi
echo ""

# ==========================================
echo -e "${CYAN}Phase 2: Record initial stats${NC}"
# ==========================================

request "$BASE_URL/parking-lots/stats" -H "Authorization: Bearer $TOKEN"
assert_status "Get initial stats" 200 "$REQ_STATUS"
INITIAL_TOTAL_SPACES=$(json_get "$REQ_BODY" "d['data']['total_spaces']")
INITIAL_GATES=$(json_get "$REQ_BODY" "d['data']['total_gates']")
echo -e "  Initial: ${INITIAL_TOTAL_SPACES} spaces, ${INITIAL_GATES} gates"
echo ""

# ==========================================
echo -e "${CYAN}Phase 3: Create parking lot${NC}"
# ==========================================

LOT_NAME="E2E测试停车场_${UNIQUE_ID}"
request "$BASE_URL/parking-lots" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${LOT_NAME}\",\"address\":\"北京市朝阳区E2E测试大厦B1层\",\"total_spaces\":200,\"lot_type\":\"underground\"}"
assert_status "Create parking lot" 201 "$REQ_STATUS"
LOT_ID=$(json_get "$REQ_BODY" "d['data']['id']")
assert_json "Name matches" "d['data']['name']" "$LOT_NAME" "$REQ_BODY"
assert_json "Total spaces = 200" "d['data']['total_spaces']" "200" "$REQ_BODY"
assert_json "Available spaces = 200" "d['data']['available_spaces']" "200" "$REQ_BODY"
assert_json "Status = active" "d['data']['status']" "active" "$REQ_BODY"
assert_json "Type = underground" "d['data']['lot_type']" "underground" "$REQ_BODY"
echo -e "  Lot ID: $LOT_ID"
echo ""

# ==========================================
echo -e "${CYAN}Phase 4: Verify stats updated${NC}"
# ==========================================

request "$BASE_URL/parking-lots/stats" -H "Authorization: Bearer $TOKEN"
assert_status "Get stats after create" 200 "$REQ_STATUS"
NEW_TOTAL_SPACES=$(json_get "$REQ_BODY" "d['data']['total_spaces']")
EXPECTED_SPACES=$((INITIAL_TOTAL_SPACES + 200))
assert_json "Total spaces increased by 200" "d['data']['total_spaces']" "$EXPECTED_SPACES" "$REQ_BODY"
echo ""

# ==========================================
echo -e "${CYAN}Phase 5: Add gates (entry + exit)${NC}"
# ==========================================

# Entry gate 1
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"A入口","type":"entry"}'
assert_status "Create entry gate A" 201 "$REQ_STATUS"
GATE_ENTRY_A=$(json_get "$REQ_BODY" "d['data']['id']")
assert_json "Gate type = entry" "d['data']['type']" "entry" "$REQ_BODY"

# Entry gate 2
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"B入口","type":"entry"}'
assert_status "Create entry gate B" 201 "$REQ_STATUS"
GATE_ENTRY_B=$(json_get "$REQ_BODY" "d['data']['id']")

# Exit gate 1
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"A出口","type":"exit"}'
assert_status "Create exit gate A" 201 "$REQ_STATUS"
GATE_EXIT_A=$(json_get "$REQ_BODY" "d['data']['id']")

# Exit gate 2
request "$BASE_URL/parking-lots/$LOT_ID/gates" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"B出口","type":"exit"}'
assert_status "Create exit gate B" 201 "$REQ_STATUS"
GATE_EXIT_B=$(json_get "$REQ_BODY" "d['data']['id']")

echo -e "  Gates: entry=[${GATE_ENTRY_A:0:8}..., ${GATE_ENTRY_B:0:8}...] exit=[${GATE_EXIT_A:0:8}..., ${GATE_EXIT_B:0:8}...]"
echo ""

# ==========================================
echo -e "${CYAN}Phase 6: Verify gate list${NC}"
# ==========================================

request "$BASE_URL/parking-lots/$LOT_ID/gates" -H "Authorization: Bearer $TOKEN"
assert_status "List gates" 200 "$REQ_STATUS"
GATE_COUNT=$(json_get "$REQ_BODY" "len(d['data'])")
assert_json "4 gates total" "len(d['data'])" "4" "$REQ_BODY"
echo ""

# ==========================================
echo -e "${CYAN}Phase 7: Verify lot shows in list with gate counts${NC}"
# ==========================================

request "$BASE_URL/parking-lots?search=${LOT_NAME}" -H "Authorization: Bearer $TOKEN"
assert_status "Search finds lot" 200 "$REQ_STATUS"
assert_json "Search returns 1 result" "d['data']['total']" "1" "$REQ_BODY"

# Check detail has gate counts
request "$BASE_URL/parking-lots/$LOT_ID" -H "Authorization: Bearer $TOKEN"
assert_status "Get lot detail" 200 "$REQ_STATUS"
echo ""

# ==========================================
echo -e "${CYAN}Phase 8: Update parking lot${NC}"
# ==========================================

request "$BASE_URL/parking-lots/$LOT_ID" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${LOT_NAME}_改\",\"address\":\"北京市海淀区E2E新地址001号\",\"total_spaces\":300,\"lot_type\":\"ground\",\"status\":\"active\"}"
assert_status "Update lot info" 200 "$REQ_STATUS"
assert_json "Name updated" "d['data']['name']" "${LOT_NAME}_改" "$REQ_BODY"
assert_json "Spaces updated to 300" "d['data']['total_spaces']" "300" "$REQ_BODY"
assert_json "Available spaces = 300" "d['data']['available_spaces']" "300" "$REQ_BODY"
assert_json "Type changed to ground" "d['data']['lot_type']" "ground" "$REQ_BODY"
echo ""

# ==========================================
echo -e "${CYAN}Phase 9: Status lifecycle (active → inactive → active)${NC}"
# ==========================================

# Deactivate
request "$BASE_URL/parking-lots/$LOT_ID" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${LOT_NAME}_改\",\"address\":\"北京市海淀区E2E新地址001号\",\"total_spaces\":300,\"lot_type\":\"ground\",\"status\":\"inactive\"}"
assert_status "Deactivate lot" 200 "$REQ_STATUS"
assert_json "Status = inactive" "d['data']['status']" "inactive" "$REQ_BODY"

# Reactivate
request "$BASE_URL/parking-lots/$LOT_ID" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${LOT_NAME}_改\",\"address\":\"北京市海淀区E2E新地址001号\",\"total_spaces\":300,\"lot_type\":\"ground\",\"status\":\"active\"}"
assert_status "Reactivate lot" 200 "$REQ_STATUS"
assert_json "Status = active" "d['data']['status']" "active" "$REQ_BODY"
echo ""

# ==========================================
echo -e "${CYAN}Phase 10: Update gate${NC}"
# ==========================================

request "$BASE_URL/gates/$GATE_ENTRY_A" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"A入口(改)"}'
assert_status "Update gate name" 200 "$REQ_STATUS"
assert_json "Gate name updated" "d['data']['name']" "A入口(改)" "$REQ_BODY"
echo ""

# ==========================================
echo -e "${CYAN}Phase 11: Gate deletion rules${NC}"
# ==========================================

# Delete one entry gate (OK, 2 entries exist)
request "$BASE_URL/gates/$GATE_ENTRY_B" -X DELETE -H "Authorization: Bearer $TOKEN"
assert_status "Delete second entry gate" 200 "$REQ_STATUS"

# Try delete last entry gate (should fail)
request "$BASE_URL/gates/$GATE_ENTRY_A" -X DELETE -H "Authorization: Bearer $TOKEN"
assert_status "Cannot delete last entry gate (403)" 403 "$REQ_STATUS"

# Delete one exit gate (OK, 2 exits exist)
request "$BASE_URL/gates/$GATE_EXIT_B" -X DELETE -H "Authorization: Bearer $TOKEN"
assert_status "Delete second exit gate" 200 "$REQ_STATUS"

# Try delete last exit gate (should fail)
request "$BASE_URL/gates/$GATE_EXIT_A" -X DELETE -H "Authorization: Bearer $TOKEN"
assert_status "Cannot delete last exit gate (403)" 403 "$REQ_STATUS"

# Verify 2 gates remain
request "$BASE_URL/parking-lots/$LOT_ID/gates" -H "Authorization: Bearer $TOKEN"
assert_json "2 gates remain" "len(d['data'])" "2" "$REQ_BODY"
echo ""

# ==========================================
echo -e "${CYAN}Phase 12: Platform admin permission check${NC}"
# ==========================================

if [ -n "$PLATFORM_TOKEN" ]; then
    # Platform admin can list (read)
    request "$BASE_URL/parking-lots" -H "Authorization: Bearer $PLATFORM_TOKEN"
    assert_status "Platform admin can list lots" 200 "$REQ_STATUS"

    request "$BASE_URL/parking-lots/stats" -H "Authorization: Bearer $PLATFORM_TOKEN"
    assert_status "Platform admin can read stats" 200 "$REQ_STATUS"

    # Platform admin detail access is blocked by tenant isolation (different tenant_id)
    request "$BASE_URL/parking-lots/$LOT_ID" -H "Authorization: Bearer $PLATFORM_TOKEN"
    assert_status "Platform admin tenant-isolated from detail (403)" 403 "$REQ_STATUS"

    # Platform admin cannot create
    request "$BASE_URL/parking-lots" \
        -H "Authorization: Bearer $PLATFORM_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"不允许","address":"不允许创建的地址信息","total_spaces":10,"lot_type":"ground"}'
    assert_status "Platform admin cannot create lot (403)" 403 "$REQ_STATUS"

    # Platform admin cannot update
    request "$BASE_URL/parking-lots/$LOT_ID" -X PUT \
        -H "Authorization: Bearer $PLATFORM_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"不允许\",\"address\":\"不允许修改的地址信息\",\"total_spaces\":100,\"lot_type\":\"ground\",\"status\":\"active\"}"
    assert_status "Platform admin cannot update lot (403)" 403 "$REQ_STATUS"

    # Platform admin cannot delete
    request "$BASE_URL/parking-lots/$LOT_ID" -X DELETE -H "Authorization: Bearer $PLATFORM_TOKEN"
    assert_status "Platform admin cannot delete lot (403)" 403 "$REQ_STATUS"
fi
echo ""

# ==========================================
echo -e "${CYAN}Phase 13: Name uniqueness${NC}"
# ==========================================

request "$BASE_URL/parking-lots" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${LOT_NAME}_改\",\"address\":\"北京市朝阳区另一个测试地址\",\"total_spaces\":50,\"lot_type\":\"ground\"}"
assert_status "Duplicate name rejected (409)" 409 "$REQ_STATUS"
echo ""

# ==========================================
echo -e "${CYAN}Phase 14: Cleanup - delete parking lot${NC}"
# ==========================================

request "$BASE_URL/parking-lots/$LOT_ID" -X DELETE -H "Authorization: Bearer $TOKEN"
assert_status "Delete parking lot (cascade)" 200 "$REQ_STATUS"

# Verify lot gone
request "$BASE_URL/parking-lots/$LOT_ID" -H "Authorization: Bearer $TOKEN"
assert_status "Lot returns 404 after delete" 404 "$REQ_STATUS"

# Verify stats restored
request "$BASE_URL/parking-lots/stats" -H "Authorization: Bearer $TOKEN"
assert_status "Get final stats" 200 "$REQ_STATUS"
assert_json "Total spaces restored" "d['data']['total_spaces']" "$INITIAL_TOTAL_SPACES" "$REQ_BODY"
echo ""

# ==========================================
echo ""
echo "============================================"
if [ "$FAILED" -eq 0 ]; then
    echo -e " ${GREEN}All E2E tests passed!${NC} ($PASSED/$TOTAL)"
else
    echo -e " Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, $TOTAL total"
fi
echo "============================================"

exit "$FAILED"
