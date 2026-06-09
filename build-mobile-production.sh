#!/bin/bash
# Build passenger app — points to production server
set -e
cd "$(dirname "$0")/mobile"

SERVER_IP="${SERVER_IP:-2.58.82.168}"
PORT="${PORT:-4000}"
API_BASE="http://${SERVER_IP}:${PORT}"

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
