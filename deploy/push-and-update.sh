#!/bin/bash
# MacBook — push GitHub kadib server-ka update (SSH)
# Isticmaal: ./deploy/push-and-update.sh
set -e

SERVER="${DEPLOY_SERVER:-root@2.58.82.168}"
APP_DIR="${DEPLOY_DIR:-/var/www/html/Safe-Fare-Bus}"

echo "==> git push"
git push

echo "==> SSH update server"
ssh "$SERVER" "cd $APP_DIR && bash deploy/update-server.sh"

echo "==> Done"
