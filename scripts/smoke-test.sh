#!/usr/bin/env bash
# MVP API smoke test (ТЗ MVP, раздел 11). Requires: curl, jq; backend running (docker compose up).
# Usage: ./scripts/smoke-test.sh [http://localhost:8080]
# Creates a NEW test user each run; does not delete anything.
set -euo pipefail

BASE="${1:-http://localhost:8080}/api/v1"
ORIGIN="${ORIGIN:-http://localhost:5173}"
PASS=0
FAIL=0

command -v jq >/dev/null || { echo "jq is required (macOS: brew install jq)"; exit 2; }
response_file=$(mktemp)
trap 'rm -f -- "$response_file"' EXIT

ok()   { PASS=$((PASS + 1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL + 1)); echo "  FAIL  $1"; }
check() { if [ "$2" = "$3" ]; then ok "$1 ($3)"; else bad "$1: expected '$3', got '$2'"; fi; }

# call METHOD PATH [JSON] -> sets $STATUS and $BODY
call() {
  local method=$1 path=$2 data=${3:-}
  local args=(-sS -o "$response_file" -w '%{http_code}' -X "$method" "$BASE$path" -H "Origin: $ORIGIN")
  [ -n "${TOKEN:-}" ] && args+=(-H "Authorization: Bearer $TOKEN")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' --data "$data")
  STATUS=$(curl "${args[@]}")
  BODY=$(cat "$response_file")
}

coords() { # checkpoint id -> {"lat":..,"lng":..,"accuracyMeters":10}
  echo "$GAME" | jq -c --arg id "$1" '.checkpoints[] | select(.id==$id) | {lat, lng, accuracyMeters: 10}'
}

echo "== 0. ping"
call GET /ping; check "GET /ping" "$STATUS" 200

echo "== 1. register a test user (existing auth module)"
call GET "/cities?query=%D0%9D%D0%B8%D0%B6%D0%BD%D0%B8%D0%B9&limit=1"
CITY_ID=$(echo "$BODY" | jq -r '.items[0].id')
EMAIL="smoke$(date +%s)$RANDOM@example.com"
call POST /auth/register "{\"displayName\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"StrongPass123!\",\"cityId\":$CITY_ID}"
check "POST /auth/register" "$STATUS" 201
TOKEN=$(echo "$BODY" | jq -r '.accessToken')

echo "== 2. discovery feed"
call GET "/events?category=all"; check "GET /events" "$STATUS" 200
check "at least 6 cards" "$(echo "$BODY" | jq '.items | length >= 6')" true
call GET "/discovery?category=festivals"
check "festivals filter" "$(echo "$BODY" | jq -c '[.items[].category] | unique')" '["FESTIVALS"]'
call GET "/events?category=nope"; check "bad category" "$STATUS" 400

echo "== 3. initial game state"
call GET /game; check "GET /game" "$STATUS" 200
GAME=$BODY
check "score=0" "$(echo "$GAME" | jq '.progress.score')" 0
check "level NOVICE" "$(echo "$GAME" | jq -r '.progress.level')" NOVICE
check "hidden locked" "$(echo "$GAME" | jq '.routes[] | select(.id=="hidden") | .unlocked')" false
check "4 visible checkpoints" "$(echo "$GAME" | jq '.checkpoints | length')" 4

echo "== 4. map API"
call GET '/game?includeCheckpoints=false'; check "GET /game summary" "$STATUS" 200
check "summary omits checkpoints" "$(jq '.checkpoints | length' <<< "$BODY")" 0
call GET '/checkpoints?bbox=43.98,56.31,44.02,56.35'
check "GET /checkpoints viewport" "$STATUS" 200
check "available and locked markers" "$(jq -c '[.items[].status] | unique' <<< "$BODY")" '["AVAILABLE","LOCKED"]'
call GET '/checkpoints?bbox=43.98,56.31,44.02,56.35&routeId=hidden'
check "filter by route" "$(jq -c '[.items[].routeId] | unique' <<< "$BODY")" '["hidden"]'
call GET '/checkpoints/cp_y01'; check "checkpoint details" "$STATUS" 200
check "localized preview" "$(jq -r '.description.ru | length > 0' <<< "$BODY")" true
call GET '/checkpoints/unknown'; check "unknown checkpoint" "$STATUS" 404
call GET '/checkpoints?bbox=0,0,NaN,1'; check "invalid viewport" "$STATUS" 400
call GET '/game?includeCheckpoints=abc'; check "invalid game query" "$STATUS" 400
call GET '/cities?limit=abc'; check "invalid city limit" "$STATUS" 400

echo "== 5. error cases"
call POST /checkpoints/cp_y01/collect '{"lat":56.30,"lng":43.90,"accuracyMeters":10}'
check "too far -> 403" "$STATUS" 403; check "code TOO_FAR" "$(echo "$BODY" | jq -r '.error.code')" TOO_FAR
call POST /checkpoints/cp_y01/collect "$(coords cp_y01 | jq -c '.accuracyMeters=500')"
check "inaccurate GPS -> 422" "$STATUS" 422
call POST /checkpoints/cp_g02/collect '{"lat":56.3294,"lng":43.9938,"accuracyMeters":10}'
check "hidden before 60 -> ROUTE_LOCKED" "$(echo "$BODY" | jq -r '.error.code')" ROUTE_LOCKED
call POST /checkpoints/cp_y01/collect '{"lat":56.3}'
check "missing fields -> 400" "$STATUS" 400
call GET /progress; check "score still 0" "$(echo "$BODY" | jq '.score')" 0

echo "== 6. collect the base route: 10 + 10 + 30 + 10"
EXPECTED=(10 20 50 60)
i=0
for id in cp_y01 cp_y02 cp_g01 cp_y03; do
  call POST "/checkpoints/$id/collect" "$(coords $id)"
  check "collect $id" "$STATUS" 200
  check "score after $id" "$(echo "$BODY" | jq '.progress.score')" "${EXPECTED[$i]}"
  [ "$id" = cp_g01 ] && check "green has placeCard" "$(echo "$BODY" | jq '.placeCard != null')" true
  [ "$id" = cp_y01 ] && check "yellow placeCard null" "$(echo "$BODY" | jq '.placeCard')" null
  i=$((i + 1))
done
check "level EXPLORER" "$(echo "$BODY" | jq -r '.progress.level')" EXPLORER
check "hidden newly unlocked" "$(echo "$BODY" | jq -c '.newlyUnlockedRoutes')" '["hidden"]'

echo "== 7. repeat collect gives +0"
call POST /checkpoints/cp_y01/collect "$(coords cp_y01)"
check "alreadyCollected" "$(echo "$BODY" | jq '.alreadyCollected')" true
check "pointsAwarded 0" "$(echo "$BODY" | jq '.pointsAwarded')" 0
check "score still 60" "$(echo "$BODY" | jq '.progress.score')" 60

echo "== 8. state after reload"
call GET /game; GAME=$BODY
check "6 visible checkpoints" "$(echo "$GAME" | jq '.checkpoints | length')" 6
check "hidden unlocked" "$(echo "$GAME" | jq '.routes[] | select(.id=="hidden") | .unlocked')" true
call POST /checkpoints/cp_g02/collect "$(coords cp_g02)"
check "collect hidden cp_g02" "$(echo "$BODY" | jq '.progress.score')" 90

echo "== 9. AI (works with or without a model: source AI|FALLBACK)"
call GET "/ai/hint?checkpointId=cp_g01&lang=ru"; check "GET /ai/hint" "$STATUS" 200
echo "        source=$(echo "$BODY" | jq -r '.source')  text=$(echo "$BODY" | jq -r '.text' | cut -c1-80)…"
call GET "/ai/hint?checkpointId=cp_y04&lang=ru"; check "hint for not collected -> 403" "$STATUS" 403
call GET "/ai/recommendations?lang=en"; check "GET /ai/recommendations" "$STATUS" 200
check "explorer gets HIDDEN places" "$(echo "$BODY" | jq -r '[.items[].tier] | unique | join(",")')" HIDDEN

echo "== 10. auth required"
TOKEN="" call GET /game; check "no token -> 401" "$STATUS" 401

echo
echo "passed=$PASS failed=$FAIL"
[ "$FAIL" -eq 0 ]
