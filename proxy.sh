#!/usr/bin/env bash
# Starts (or updates) the front door for TWO sites on one server:
#   ./proxy.sh
# Settings in .env.proxy (copy .env.proxy.example).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.proxy ]; then
  echo "❌ .env.proxy is missing. Copy .env.proxy.example to .env.proxy and fill it in."
  exit 1
fi

# The private network the front door and both sites share
docker network inspect yummiii-web >/dev/null 2>&1 || docker network create yummiii-web

docker compose --env-file .env.proxy -f docker/proxy/compose.yaml up -d
echo "✅ Front door running. Shop: https://$(grep '^SHOP_DOMAIN=' .env.proxy | cut -d= -f2-)  Demo: https://$(grep '^DEMO_DOMAIN=' .env.proxy | cut -d= -f2-)"
