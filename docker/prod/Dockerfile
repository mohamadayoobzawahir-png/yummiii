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

# The built React app, and the web server config
COPY --from=frontend /build/dist /app/frontend
COPY docker/prod/Caddyfile /etc/frankenphp/Caddyfile
COPY docker/prod/entrypoint.sh /usr/local/bin/yummiii-entrypoint
RUN chmod +x /usr/local/bin/yummiii-entrypoint

ENTRYPOINT ["yummiii-entrypoint"]
CMD ["--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]
