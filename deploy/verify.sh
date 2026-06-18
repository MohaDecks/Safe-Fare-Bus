#!/usr/bin/env bash
# Quick check that server files match GitHub main
set -e
cd "$(dirname "$0")/.."

echo "=== Git ==="
git log -1 --oneline
echo ""

echo "=== Branding (should say Dirshay Bus) ==="
grep DEFAULT_BRAND_NAME admin-portal/js/core/config.js || true
echo ""

echo "=== Login page (should NOT mention employer) ==="
grep -n "employer\|SafeFare\|Corporate login" admin-portal/js/pages/auth/login.js && echo "OLD TEXT FOUND!" || echo "OK — login.js is updated"
echo ""

echo "=== package.json ==="
test -f package.json && echo "OK" || echo "MISSING — run git pull"
echo ""

echo "=== PM2 ==="
${PM2_CMD:-sudo pm2} status safefare 2>/dev/null || echo "pm2 safefare not running"
echo ""

echo "=== API ==="
curl -s http://127.0.0.1:4000/api/branding 2>/dev/null || echo "API not responding on :4000"
