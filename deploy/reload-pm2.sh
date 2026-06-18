#!/usr/bin/env bash
# Stop duplicates, free port 4000, start single pm2 process
set -e
PM2="${PM2_CMD:-pm2}"
NAME="${PM2_APP_NAME:-safefare}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-4000}"

echo "→ deploy: $NAME (port $PORT)"

# systemd + pm2 both running causes EADDRINUSE — keep pm2 only
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet safefare 2>/dev/null; then
  echo "→ stopping systemd safefare (use pm2 only)"
  sudo systemctl stop safefare 2>/dev/null || systemctl stop safefare
  sudo systemctl disable safefare 2>/dev/null || true
fi

# Stop pm2 app cleanly before restart
if $PM2 describe "$NAME" >/dev/null 2>&1; then
  echo "→ pm2 stop & delete $NAME"
  $PM2 stop "$NAME" 2>/dev/null || true
  $PM2 delete "$NAME" 2>/dev/null || true
  sleep 1
fi

# Kill orphan node still holding the port
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -i:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "→ freeing port $PORT (pids: $PIDS)"
    kill $PIDS 2>/dev/null || sudo kill $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

echo "→ pm2 start $NAME"
cd "$ROOT/backend"
$PM2 start src/index.js --name "$NAME"
$PM2 save 2>/dev/null || true
sleep 1
$PM2 status "$NAME" || true

if command -v curl >/dev/null 2>&1; then
  echo ""
  curl -sf "http://127.0.0.1:${PORT}/api" >/dev/null && echo "✓ API OK on port $PORT" || echo "✗ API not responding yet — check: $PM2 logs $NAME"
fi
