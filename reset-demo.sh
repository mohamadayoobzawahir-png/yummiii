#!/usr/bin/env bash
# Puts fresh demo data into the PORTFOLIO DEMO. Run nightly with cron:
#   ./reset-demo.sh
# Laravel refuses unless that site has DEMO_MODE=true, so it can't wipe the real shop.
set -euo pipefail
cd "$(dirname "$0")"
. docker/prod/site.sh demo

$DC exec -T app php artisan yummiii:reset-demo
