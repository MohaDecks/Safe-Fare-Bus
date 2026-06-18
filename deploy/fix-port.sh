#!/usr/bin/env bash
# One-time fix: port 4000 stuck / pm2 crash loop
set -e
PM2="${PM2_CMD:-pm2}"
NAME="${PM2_APP_NAME:-safefare}"
PORT="${PORT:-4000}"

echo "=== Fix port $PORT for $NAME ==="

sudo systemctl stop safefare 2>/dev/null || systemctl stop safefare 2>/dev/null || true
$PM2 stop "$NAME" 2>/dev/null || true
$PM2 delete "$NAME" 2>/dev/null || true
$PM2 delete all 2>/dev/null || true

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -i:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Killing: $PIDS"
    sudo kill -9 $PIDS 2>/dev/null || kill -9 $PIDS 2>/dev/null || true
  fi
fi

sleep 2
echo "Port $PORT:"
lsof -i:"$PORT" -sTCP:LISTEN 2>/dev/null || echo "(free)"

echo ""
echo "Now run from repo root:"
echo "  PM2_CMD=\"sudo pm2\" npm run deploy"
