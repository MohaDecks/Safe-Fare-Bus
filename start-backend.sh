#!/bin/bash
# Bilow backend + staff portal
cd "$(dirname "$0")/backend"

if lsof -i :4000 -t >/dev/null 2>&1; then
  echo "Port 4000 busy — stopping old server..."
  kill $(lsof -t -i:4000) 2>/dev/null
  sleep 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created backend/.env"
fi

npm run dev
