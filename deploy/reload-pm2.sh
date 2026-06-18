#!/usr/bin/env bash
set -e
PM2="${PM2_CMD:-pm2}"
NAME="${PM2_APP_NAME:-safefare}"

if $PM2 describe "$NAME" >/dev/null 2>&1; then
  echo "→ pm2 reload $NAME"
  $PM2 reload "$NAME"
else
  echo "→ pm2 process '$NAME' not found — starting backend"
  cd "$(dirname "$0")/../backend"
  $PM2 start src/index.js --name "$NAME"
fi

$PM2 status "$NAME" || true
