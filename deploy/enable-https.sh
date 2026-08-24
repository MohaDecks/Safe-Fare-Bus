#!/usr/bin/env bash
# Start Dirsha on port 4001 and enable HTTPS for dirshay.com
# Run on the server as root from anywhere:
#   bash /var/www/html/Safe-Fare-Bus/deploy/enable-https.sh
set -euo pipefail

ROOT="${APP_DIR:-/var/www/html/Safe-Fare-Bus}"
ENV_FILE="$ROOT/backend/.env"
NGINX_SRC="$ROOT/deploy/nginx-dirshay.com.conf"
NGINX_DST="/etc/nginx/sites-available/dirshay.com"
PORT="${SAFEFARE_PORT:-4001}"
DOMAIN="${DOMAIN:-dirshay.com}"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: orod as root (sudo bash deploy/enable-https.sh)"
  exit 1
fi

if [ ! -d "$ROOT/backend" ]; then
  echo "ERROR: $ROOT/backend ma jiro"
  exit 1
fi

echo "→ MongoDB"
systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null || true

echo "→ backend/.env (PORT=$PORT, PUBLIC_URL=https://$DOMAIN)"
touch "$ENV_FILE"
set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}
set_env PORT "$PORT"
set_env HOST 127.0.0.1
set_env PUBLIC_URL "https://${DOMAIN}"
set_env CORS_ORIGINS "https://${DOMAIN},http://${DOMAIN},https://www.${DOMAIN}"
if ! grep -q "^JWT_SECRET=" "$ENV_FILE" || grep -q "change-me-in-production" "$ENV_FILE"; then
  set_env JWT_SECRET "$(openssl rand -hex 32)"
fi
if ! grep -q "^MONGODB_URI=" "$ENV_FILE"; then
  set_env MONGODB_URI "mongodb://127.0.0.1:27017/safefare"
fi

echo "→ npm install"
cd "$ROOT/backend"
npm install --omit=dev

echo "→ pm2 start safefare on :$PORT (deknest on :4000 is not touched)"
if command -v pm2 >/dev/null 2>&1; then
  PM2=pm2
else
  echo "ERROR: pm2 lama helin. Ku rakib: npm i -g pm2"
  exit 1
fi

if $PM2 describe safefare >/dev/null 2>&1; then
  $PM2 delete safefare
fi

# Free 4001 only — never kill whatever is on 4000 (deknest)
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -i:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "${PIDS:-}" ]; then
    echo "→ freeing port $PORT (pids: $PIDS)"
    kill $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

cd "$ROOT/backend"
$PM2 start src/index.js --name safefare
$PM2 save
sleep 2

echo "→ API check"
if ! curl -sf "http://127.0.0.1:${PORT}/api" | grep -q .; then
  echo "WARNING: API ma jawaabin :$PORT — pm2 logs safefare"
  $PM2 logs safefare --lines 30 --nostream || true
fi

echo "→ nginx site for $DOMAIN"
if [ ! -f "$NGINX_SRC" ]; then
  echo "ERROR: $NGINX_SRC ma jiro"
  exit 1
fi
cp "$NGINX_SRC" "$NGINX_DST"
ln -sfn "$NGINX_DST" /etc/nginx/sites-enabled/dirshay.com
nginx -t
systemctl reload nginx

echo "→ certbot (Let's Encrypt)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "ERROR: certbot wuu fashilmay. Hubi DNS: $DOMAIN → server IP"
  exit 1
}

systemctl reload nginx

echo ""
echo "Done."
echo "  Portal:  https://${DOMAIN}/admin/"
echo "  API:     https://${DOMAIN}/api"
echo "  Privacy: https://${DOMAIN}/privacy"
echo ""
curl -sI "https://${DOMAIN}/admin/" | head -8 || true
