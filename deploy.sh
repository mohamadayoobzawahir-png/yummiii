#!/usr/bin/env bash
# Build and (re)start the LIVE Yummiii. Run it on the server, from the project folder:
#   ./deploy.sh
# Safe to run again for every update: it rebuilds, restarts and runs new migrations.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.prod ]; then
  echo "❌ .env.prod is missing. Copy .env.prod.example to .env.prod and fill it in."
  exit 1
fi

DC="docker compose --env-file .env.prod -f compose.prod.yaml"

echo "🔨 Building..."
$DC build --pull app

echo "🚀 Starting..."
$DC up -d

echo "⏳ Waiting for the database (the very first start can take a few minutes)..."
# (db:show only checks the connection, so it also works on a brand-new, empty database)
until $DC exec -T app php artisan db:show >/dev/null 2>&1; do sleep 5; done

echo "🗄️ Updating the database..."
$DC exec -T app php artisan migrate --force

echo "✅ Yummiii is live at $(grep '^APP_URL=' .env.prod | cut -d= -f2-)"
