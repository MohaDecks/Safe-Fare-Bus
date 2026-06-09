#!/bin/bash
# Production — backend + staff portal (server)
set -e
cd "$(dirname "$0")/backend"

if [ ! -f .env ]; then
  echo "ERROR: backend/.env ma jiro. Abuur .env adigoo isticmaalaya .env.example"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js lama helin. Ku rakib server-ka."
  exit 1
fi

npm install --omit=dev
npm start
