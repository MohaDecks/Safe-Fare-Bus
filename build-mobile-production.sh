#!/bin/bash
# Build passenger app — points to production server
# Default: split APK (~20MB phone) not universal fat APK (~65MB+)
set -e
cd "$(dirname "$0")/mobile"

DOMAIN="${DOMAIN:-dirshay.com}"
PORT="${PORT:-4000}"
# nginx (https://dirshay.com) → no port. Direct backend :4000 → USE_PORT=true
USE_PORT="${USE_PORT:-false}"
USER_API_BASE="${API_BASE:-}"

if [ -n "$USER_API_BASE" ]; then
  API_URL="$USER_API_BASE"
elif [ "$USE_PORT" = "true" ]; then
  API_URL="http://${DOMAIN}:${PORT}"
else
  API_URL="https://${DOMAIN}"
fi

BUILD_KIND="${1:-apk}"
SPLIT="${SPLIT_APK:-true}"

echo "Building mobile release → API: $API_URL"
flutter pub get

COMMON_FLAGS=(--release --tree-shake-icons)
if [ -n "$USER_API_BASE" ] || [ "$USE_PORT" = "true" ]; then
  COMMON_FLAGS+=(--dart-define=API_BASE="$API_URL")
else
  echo "Using ApiConfig.productionBase ($API_URL) — same as https://dirshay.com/admin/"
fi

if [ "$BUILD_KIND" = "apk" ]; then
  if [ "$SPLIT" = "true" ]; then
    flutter build apk "${COMMON_FLAGS[@]}" --split-per-abi
    echo ""
    echo "Split APKs (install arm64 on most phones):"
    ls -lh build/app/outputs/flutter-apk/app-*-release.apk 2>/dev/null || true
    echo ""
    echo "  Phone (recommended): build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
  else
    flutter build apk "${COMMON_FLAGS[@]}"
    ls -lh build/app/outputs/flutter-apk/app-release.apk
  fi
elif [ "$BUILD_KIND" = "aab" ]; then
  flutter build appbundle "${COMMON_FLAGS[@]}"
  ls -lh build/app/outputs/bundle/release/app-release.aab
  echo "Upload .aab to Google Play (smallest download for users)"
elif [ "$BUILD_KIND" = "ios" ]; then
  flutter build ios "${COMMON_FLAGS[@]}"
else
  echo "Usage: $0 [apk|aab|ios]"
  exit 1
fi
