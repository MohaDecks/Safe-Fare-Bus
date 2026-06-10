#!/bin/bash
# SafeFare — server update (orod kadib git push)
# Isticmaal: ./deploy/update-server.sh
set -e

APP_DIR="${APP_DIR:-/var/www/html/Safe-Fare-Bus}"
APP_NAME="${APP_NAME:-safefare}"
PORT="${PORT:-4000}"

echo "==> SafeFare update"
echo "    Dir:  $APP_DIR"
echo ""

if [ ! -d "$APP_DIR/.git" ]; then
  echo "ERROR: $APP_DIR ma jiro ama ma aha git repo."
  echo "       Hubi APP_DIR: ls -la $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "==> git pull"
git pull

echo "==> npm install"
cd backend
npm install --omit=dev
cd ..

# systemd (setup-server.sh) ama pm2 — midka jira
if systemctl is-active --quiet safefare 2>/dev/null || systemctl is-enabled --quiet safefare 2>/dev/null; then
  echo "==> systemctl restart safefare"
  systemctl restart safefare
elif command -v pm2 >/dev/null 2>&1; then
  export APP_DIR
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo "==> pm2 restart $APP_NAME"
    pm2 restart "$APP_NAME"
  else
    echo "==> pm2 start (first time)"
    pm2 start deploy/ecosystem.config.cjs
  fi
  pm2 save 2>/dev/null || true
else
  echo "==> No systemd/pm2 — starting node directly (background)"
  cd backend
  pkill -f "node src/index.js" 2>/dev/null || true
  nohup node src/index.js > /tmp/safefare.log 2>&1 &
fi

echo ""
echo "==> Health check"
sleep 2
if curl -sf "http://127.0.0.1:$PORT/api" >/dev/null; then
  echo "OK — API responding on port $PORT"
else
  echo "FAIL — API ma jawaabayo port $PORT"
  echo "       Hubi: sudo systemctl status safefare"
  echo "       ama:  pm2 logs $APP_NAME"
  echo "       ama:  sudo systemctl status mongod"
  exit 1
fi

echo ""
echo "  Done!"
echo "  Portal: http://dirshay.com:$PORT/admin/  ama  http://dirshay.com/admin/ (nginx)"
echo "  Logs:   pm2 logs $APP_NAME  ama  journalctl -u safefare -f"
echo ""
