#!/bin/bash
# Build passenger app — points to production server
set -e
cd "$(dirname "$0")/mobile"

DOMAIN="${DOMAIN:-dirshay.com}"
PORT="${PORT:-4000}"
# Set USE_PORT=false after nginx proxies dirshay.com → :4000
USE_PORT="${USE_PORT:-true}"

if [ "$USE_PORT" = "true" ]; then
  API_BASE="http://${DOMAIN}:${PORT}"
else
  API_BASE="http://${DOMAIN}"
fi

echo "Building mobile app → API: $API_BASE"
flutter pub get

if [ "$1" = "apk" ]; then
  flutter build apk --dart-define=API_BASE="$API_BASE"
  echo "APK: build/app/outputs/flutter-apk/app-release.apk"
elif [ "$1" = "ios" ]; then
  flutter build ios --dart-define=API_BASE="$API_BASE"
else
  flutter build apk --dart-define=API_BASE="$API_BASE"
  echo "APK: build/app/outputs/flutter-apk/app-release.apk"
fi
