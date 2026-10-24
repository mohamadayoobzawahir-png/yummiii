# Production image for Yummiii: React (built) + Laravel + FrankenPHP (web server with
# automatic HTTPS) in ONE image. Build from the project root:
#   docker compose --env-file .env.prod -f compose.prod.yaml build

# ---------- Stage 1: build the React app into plain HTML/CSS/JS files ----------
FROM node:22 AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# frontend/.env.production sets VITE_API_URL to "" → the app calls /api/... on its own address
RUN npm run build

# ---------- Stage 2: Laravel on FrankenPHP ----------
FROM dunglas/frankenphp:1-php8.3

RUN install-php-extensions pdo_mysql zip intl bcmath opcache

# The official image marks frankenphp with a special file permission (so non-root users can
# use ports 80/443). Hosts with stricter security, like Render, refuse to start any program
# with that mark ("exec: frankenphp: Operation not permitted"). We don't need it: on Render we
# listen on port 10000, and on our own server the container runs as root.
RUN setcap -r /usr/local/bin/frankenphp
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP's recommended production settings, plus ours (upload size, opcache)
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/prod/php.ini "$PHP_INI_DIR/conf.d/zz-yummiii.ini"

WORKDIR /app

# Install PHP packages first (only re-runs when composer files change → faster rebuilds)
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-interaction

# Faster starts: routes and views don't depend on any settings, so cache them now
# (config IS cached at start-up, because it reads the settings)
RUN php artisan route:cache && php artisan view:cache

# A ready-made PORTFOLIO DEMO database, so the free-hosted demo answers within seconds
# instead of building it at every start. Only used when DEMO_MODE=true with SQLite.
# Its pictures are kept aside, so the real shop's storage stays clean.
RUN DB_CONNECTION=sqlite DB_DATABASE=/app/database/demo-start.sqlite DEMO_MODE=true \
        APP_URL=http://demo.invalid APP_KEY=base64:YnVpbGQtdGltZS1vbmx5LWtleS0xMjM0NTY3ODkwYWI= \
        sh -c 'touch "$DB_DATABASE" \
            && php artisan migrate --force \
            && php artisan db:seed --class="Database\Seeders\DemoSeeder" --force' \
    && mkdir -p database/demo-pictures \
    && mv storage/app/public/products/* database/demo-pictures/

# The built React app, and the web server config
COPY --from=frontend /build/dist /app/frontend
COPY docker/prod/Caddyfile /etc/frankenphp/Caddyfile
COPY docker/prod/entrypoint.sh /usr/local/bin/yummiii-entrypoint
RUN chmod +x /usr/local/bin/yummiii-entrypoint

ENTRYPOINT ["yummiii-entrypoint"]
CMD ["--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]
