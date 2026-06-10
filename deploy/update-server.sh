#!/bin/bash
# SafeFare — server update (orod kadib git push)
# Isticmaal: ./deploy/update-server.sh
set -e

APP_DIR="${APP_DIR:-/var/www/html/Safe-Fare-Bus}"
APP_NAME="${APP_NAME:-safefare}"

echo "==> SafeFare update"
echo "    Dir:  $APP_DIR"
echo ""

cd "$APP_DIR"

echo "==> git pull"
git pull

echo "==> npm install"
cd backend
npm install --omit=dev
cd ..

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "==> pm2 restart $APP_NAME"
  pm2 restart "$APP_NAME"
else
  echo "==> pm2 start (first time)"
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save 2>/dev/null || true

echo ""
echo "==> Health check"
sleep 2
curl -sf "http://127.0.0.1:${PORT:-4000}/api" | head -c 120 || echo "(API not responding yet — check: pm2 logs $APP_NAME)"
echo ""
echo ""
echo "  Done! Portal: http://dirshay.com:4000/admin/"
echo "  Logs:       pm2 logs $APP_NAME"
echo ""
