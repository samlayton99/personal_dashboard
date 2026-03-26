#!/bin/bash

# ============================================================
# test-lock.sh — Force lock/unlock the dashboard for testing
#
# Usage:
#   ./test-lock.sh lock     # Lock the dashboard immediately
#   ./test-lock.sh unlock   # Unlock the dashboard
#   ./test-lock.sh status   # Check current lock state
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
source "$PROJECT_DIR/.env.local"

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  exit 1
fi

API="$NEXT_PUBLIC_SUPABASE_URL/rest/v1/system_state?id=eq.1"
HEADERS=(
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
  -H "Content-Type: application/json"
  -H "Prefer: return=representation"
)

case "${1:-status}" in
  lock)
    # Also reset last_reflection_date so the client-side check agrees
    curl -s -X PATCH "$API" "${HEADERS[@]}" \
      -d '{"is_locked": true, "locked_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "last_reflection_date": null}' \
      | python3 -m json.tool 2>/dev/null || echo "Done"
    echo "Dashboard locked. Refresh the page."
    ;;
  unlock)
    TODAY=$(date +%Y-%m-%d)
    curl -s -X PATCH "$API" "${HEADERS[@]}" \
      -d '{"is_locked": false, "last_reflection_date": "'$TODAY'"}' \
      | python3 -m json.tool 2>/dev/null || echo "Done"
    echo "Dashboard unlocked."
    ;;
  status)
    curl -s "$API" "${HEADERS[@]}" -H "Accept: application/json" \
      | python3 -m json.tool 2>/dev/null
    ;;
  *)
    echo "Usage: ./test-lock.sh [lock|unlock|status]"
    ;;
esac
