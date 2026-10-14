# Shared by deploy.sh, backup.sh and reset-demo.sh. Not run on its own.
#
#   no site name  → ONE site on the server:  settings in .env.prod, serves ports 80/443 itself
#   "shop"/"demo" → TWO sites behind the front door (docker/proxy): settings in .env.shop / .env.demo

SITE="${1:-}"

if [ -z "$SITE" ]; then
  ENV_FILE=.env.prod
  DC="docker compose --env-file $ENV_FILE -f compose.prod.yaml"
  BACKUP_DIR=backups
else
  case "$SITE" in *[!a-z0-9-]*) echo "❌ Site names may only use a-z, 0-9 and -"; exit 1 ;; esac
  ENV_FILE=".env.$SITE"
  export APP_ALIAS="yummiii-$SITE"   # the name the front door uses to reach this site
  DC="docker compose -p yummiii-$SITE --env-file $ENV_FILE -f compose.prod.yaml -f compose.behind-proxy.yaml"
  BACKUP_DIR="backups/$SITE"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE is missing. Copy .env.prod.example to $ENV_FILE and fill it in."
  exit 1
fi
