# PHP image for the Laravel backend (development)
FROM php:8.3-cli

# System packages + PHP extensions Laravel needs (pdo_mysql = talk to MySQL)
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev \
    && docker-php-ext-install pdo_mysql zip intl bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Allow product photos up to 10 MB to reach Laravel (Laravel itself limits them to 5 MB,
# so bigger photos get a friendly error message instead of silently disappearing)
RUN printf "upload_max_filesize=10M\npost_max_size=12M\n" > /usr/local/etc/php/conf.d/uploads.ini

# Run as a user with the same ID as you on the host, so files the container
# creates (migrations, controllers...) belong to you, not root
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} app && useradd -m -u ${UID} -g ${GID} app
USER app

WORKDIR /var/www/html
