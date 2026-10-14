#!/usr/bin/env bash
# Build and (re)start the LIVE Yummiii. Run it on the server, from the project folder:
#   ./deploy.sh          one site            (settings in .env.prod)
#   ./deploy.sh shop     the real shop        (settings in .env.shop, behind the front door)
#   ./deploy.sh demo     the portfolio demo   (settings in .env.demo, behind the front door)
# Safe to run again for every update: it rebuilds, restarts and runs new migrations.
set -euo pipefail
cd "$(dirname "$0")"
. docker/prod/site.sh

echo "🔨 Building..."
$DC build --pull app

echo "🚀 Starting..."
$DC up -d

echo "⏳ Waiting for the database (the very first start can take a few minutes)..."
# (db:show only checks the connection, so it also works on a brand-new, empty database)
until $DC exec -T app php artisan db:show >/dev/null 2>&1; do sleep 5; done

echo "🗄️ Updating the database..."
$DC exec -T app php artisan migrate --force

echo "✅ Yummiii${SITE:+ ($SITE)} is live at $(grep '^APP_URL=' "$ENV_FILE" | cut -d= -f2-)"
