#!/bin/bash
# Bilow passenger Flutter app (macOS)
cd "$(dirname "$0")/mobile"

if ! curl -s -m 2 http://127.0.0.1:4000/api >/dev/null 2>&1; then
  echo "ERROR: Backend ma socdo. Marka hore orod:"
  echo "  ./start-backend.sh"
  echo ""
  exit 1
fi

flutter pub get
flutter run -d macos
