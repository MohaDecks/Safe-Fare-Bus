#!/usr/bin/env bash
# Mac/local: push to GitHub then SSH update on server
set -e
cd "$(dirname "$0")/.."

SERVER="${SAFEFARE_SERVER:-root@2.58.82.168}"
REMOTE_DIR="${SAFEFARE_DIR:-/opt/safefare}"

echo "→ git push"
git push origin main

echo "→ SSH update on $SERVER"
ssh "$SERVER" "cd $REMOTE_DIR && PM2_CMD='sudo pm2' ./deploy/update-server.sh"
