#!/usr/bin/env bash
# Backs up a LIVE database and its product photos, keeping 14 days. Run nightly with cron.
#   ./backup.sh          one site       → ./backups
#   ./backup.sh shop     the real shop  → ./backups/shop
# (The demo needs no backups: it resets itself every night.)
set -euo pipefail
cd "$(dirname "$0")"
. docker/prod/site.sh

DB_PASSWORD=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
STAMP=$(date +%F-%H%M)
mkdir -p "$BACKUP_DIR"

$DC exec -T -e MYSQL_PWD="$DB_PASSWORD" mysql \
  mysqldump -uyummiii --no-tablespaces --single-transaction yummiii | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"
$DC exec -T app tar -czf - -C /app/storage/app public > "$BACKUP_DIR/photos-$STAMP.tar.gz"

# Delete backups older than 14 days
find "$BACKUP_DIR" -name '*.gz' -mtime +14 -delete
echo "✅ Backup saved: $BACKUP_DIR/db-$STAMP.sql.gz and $BACKUP_DIR/photos-$STAMP.tar.gz"
