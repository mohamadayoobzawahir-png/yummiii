#!/bin/sh
# Runs every time the app container starts, before the web server.
set -e

# ---- Hosting platforms like Render: fill in what they don't ask you for ----
# They tell the app which port to listen on, and handle HTTPS themselves
if [ -z "${SERVER_NAME:-}" ] && [ -n "${PORT:-}" ]; then
  export SERVER_NAME=":${PORT}"
fi
# Render gives the site's address in RENDER_EXTERNAL_URL
if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
  export APP_URL="$RENDER_EXTERNAL_URL"
fi
# Only used when Caddy gets its own HTTPS certificates (our own server setup)
export ACME_EMAIL="${ACME_EMAIL:-admin@example.com}"
# The DEMO can make up its own secret key: its data is thrown away on every restart anyway.
# (The real shop must always have a fixed APP_KEY in its settings.)
if [ -z "${APP_KEY:-}" ] && [ "${DEMO_MODE:-false}" = "true" ]; then
  export APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
fi

# The storage volume is empty on a brand-new server: make sure Laravel's folders exist
mkdir -p storage/app/public/products storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs

# Cache Laravel's settings for speed (routes and views were already cached in the image)
php artisan config:cache

# ---- Free-hosting DEMO: its own little SQLite database, fresh on every start ----
# Free hosts wipe the container's files whenever it restarts or wakes up, so instead of
# fighting that, the demo simply starts fresh each time (like the nightly reset).
if [ "${DEMO_MODE:-false}" = "true" ] && [ "${DB_CONNECTION:-}" = "sqlite" ]; then
  : "${DB_DATABASE:?Set DB_DATABASE to the SQLite file path}"

  # 1. Instantly: the ready-made demo from the image, with its pictures pointed at this address
  cp database/demo-start.sqlite "$DB_DATABASE"
  cp database/demo-pictures/* storage/app/public/products/
  php -r '$db = new PDO("sqlite:" . getenv("DB_DATABASE"));
          $db->prepare("UPDATE products SET image = REPLACE(image, ?, ?)")
             ->execute(["http://demo.invalid", rtrim(getenv("APP_URL"), "/")]);'

  # 2. In the background: a fresh demo with TODAY's dates, swapped in when ready (~1 minute).
  #    APP_CONFIG_CACHE points elsewhere so this job reads DB_DATABASE from its own settings.
  (
    sleep 30   # let the web server start first: free plans have very little CPU to share
    NEW="$DB_DATABASE.new"
    rm -f "$NEW" && touch "$NEW"
    export DB_DATABASE="$NEW" APP_CONFIG_CACHE=/tmp/demo-refresh-config.php
    php artisan migrate --force >/dev/null \
      && php artisan db:seed --class="Database\Seeders\DemoSeeder" --force >/dev/null \
      && mv "$NEW" "${NEW%.new}" \
      && echo "✅ Demo refreshed with today's data"
  ) &
fi

# Hand over to FrankenPHP's normal start-up
exec docker-php-entrypoint "$@"
