#!/usr/bin/env bash
# Backs up the LIVE database and product photos into ./backups, keeping 14 days.
# Run it every night with cron (see DEPLOY.md).
set -euo pipefail
cd "$(dirname "$0")"

DB_PASSWORD=$(grep '^DB_PASSWORD=' .env.prod | cut -d= -f2-)
DC="docker compose --env-file .env.prod -f compose.prod.yaml"
STAMP=$(date +%F-%H%M)
mkdir -p backups

$DC exec -T -e MYSQL_PWD="$DB_PASSWORD" mysql \
  mysqldump -uyummiii --no-tablespaces --single-transaction yummiii | gzip > "backups/db-$STAMP.sql.gz"
$DC exec -T app tar -czf - -C /app/storage/app public > "backups/photos-$STAMP.tar.gz"

# Delete backups older than 14 days
find backups -name '*.gz' -mtime +14 -delete
echo "✅ Backup saved: backups/db-$STAMP.sql.gz and backups/photos-$STAMP.tar.gz"
