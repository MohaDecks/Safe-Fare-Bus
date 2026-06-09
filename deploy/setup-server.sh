#!/bin/bash
# SafeFare — rakib server Ubuntu/Debian (IP: 2.58.82.168)
set -e

APP_DIR="${APP_DIR:-/opt/safefare}"
REPO_URL="${REPO_URL:-https://github.com/MohaDecks/Safe-Fare-Bus.git}"
SERVER_IP="${SERVER_IP:-2.58.82.168}"
PORT="${PORT:-4000}"

echo "==> SafeFare server setup"
echo "    App dir:  $APP_DIR"
echo "    Server:   http://$SERVER_IP:$PORT"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/setup-server.sh"
  exit 1
fi

apt-get update
apt-get install -y curl git

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v mongod >/dev/null 2>&1; then
  echo "==> Installing MongoDB..."
  apt-get install -y mongodb-org || apt-get install -y mongodb
fi

systemctl enable mongod 2>/dev/null || systemctl enable mongodb 2>/dev/null || true
systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null || true

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Cloning repo..."
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> Updating repo..."
  git -C "$APP_DIR" pull
fi

cd "$APP_DIR/backend"
npm install --omit=dev

if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
PORT=$PORT
HOST=0.0.0.0
PUBLIC_URL=http://$SERVER_IP:$PORT
CORS_ORIGINS=http://$SERVER_IP:$PORT
CORS_ALLOW_ALL=false
MONGODB_URI=mongodb://127.0.0.1:27017/safefare
JWT_SECRET=$JWT_SECRET
EOF
  echo "==> Created backend/.env"
else
  echo "==> backend/.env already exists — skipping"
fi

cp "$APP_DIR/deploy/safefare.service" /etc/systemd/system/safefare.service
sed -i "s|/opt/safefare|$APP_DIR|g" /etc/systemd/system/safefare.service

systemctl daemon-reload
systemctl enable safefare
systemctl restart safefare

if command -v ufw >/dev/null 2>&1; then
  ufw allow "$PORT/tcp" || true
fi

echo ""
echo "  SafeFare waa la rakibay!"
echo "  Staff portal: http://$SERVER_IP:$PORT/admin/"
echo "  API:          http://$SERVER_IP:$PORT/api"
echo ""
echo "  Status:  sudo systemctl status safefare"
echo "  Logs:    sudo journalctl -u safefare -f"
echo ""
