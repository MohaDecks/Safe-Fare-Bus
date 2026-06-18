#!/usr/bin/env bash
# Run on server after git push: pull, install deps, reload pm2
set -e
cd "$(dirname "$0")/.."

echo "→ git pull"
git pull

echo "→ npm run install:all"
npm run install:all

echo "→ npm run deploy (PM2_CMD=${PM2_CMD:-sudo pm2})"
PM2_CMD="${PM2_CMD:-sudo pm2}" npm run deploy

echo ""
git log -1 --oneline
echo "Done — portal: ${PUBLIC_URL:-http://127.0.0.1:4000}/admin/"
