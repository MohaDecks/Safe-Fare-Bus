#!/bin/bash
# SafeFare — kaliya domain (dirshay.com), IP:4000 xir
# Server-ka: sudo bash deploy/lock-domain-only.sh
set -e

APP_DIR="${APP_DIR:-/var/www/html/Safe-Fare-Bus}"
PORT="${PORT:-4000}"

echo "==> SafeFare — domain-only lock"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo"
  exit 1
fi

ENV_FILE="$APP_DIR/backend/.env"
if [ -f "$ENV_FILE" ]; then
  echo "==> Set HOST=127.0.0.1 in $ENV_FILE"
  if grep -q '^HOST=' "$ENV_FILE"; then
    sed -i 's/^HOST=.*/HOST=127.0.0.1/' "$ENV_FILE"
  else
    echo "HOST=127.0.0.1" >> "$ENV_FILE"
  fi
  if grep -q '^PUBLIC_URL=' "$ENV_FILE"; then
    sed -i 's|^PUBLIC_URL=.*|PUBLIC_URL=http://dirshay.com|' "$ENV_FILE"
  fi
else
  echo "WARN: $ENV_FILE not found — create .env first"
fi

echo "==> nginx (domain only)"
if command -v nginx >/dev/null 2>&1; then
  cp "$APP_DIR/deploy/nginx-dirshay.com.conf" /etc/nginx/sites-available/dirshay.com
  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/dirshay.com /etc/nginx/sites-enabled/
  nginx -t
  systemctl reload nginx
else
  echo "WARN: nginx not installed — apt install nginx"
fi

echo "==> firewall"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw deny "$PORT/tcp" || true
  ufw reload || true
fi

echo "==> restart app"
if systemctl is-active --quiet safefare 2>/dev/null; then
  systemctl restart safefare
elif command -v pm2 >/dev/null 2>&1; then
  sudo -u "${SUDO_USER:-www-data}" pm2 restart safefare 2>/dev/null || pm2 restart safefare || true
fi

sleep 2
echo ""
echo "==> Check (localhost only on :$PORT)"
ss -tulpn | grep ":$PORT " || echo "(nothing on $PORT — start app first)"
echo ""
echo "  Portal:  http://dirshay.com/admin/"
echo "  IP:4000: should NOT work from outside"
echo ""
