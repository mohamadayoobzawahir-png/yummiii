#!/bin/sh
# Runs every time the app container starts, before the web server.
set -e

# The storage volume is empty on a brand-new server: make sure Laravel's folders exist
mkdir -p storage/app/public/products storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/logs

# Pre-build Laravel's caches (config, routes, Blade views) for speed
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Hand over to FrankenPHP's normal start-up
exec docker-php-entrypoint "$@"
