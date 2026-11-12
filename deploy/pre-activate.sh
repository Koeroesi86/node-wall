#!/usr/bin/env bash
# Runs on the server inside the new release, before deploy-action switches the symlink.
# Links the state that must survive releases, applies migrations and checks the server config.
# /var/www/uzeno.koro.si/shared is created once by an admin (see README), owned by www-data and group writable.
set -euo pipefail

umask 002
shared="$(cd .. && pwd)/shared"

[ -f "$shared/.env" ] || { echo "Missing $shared/.env" >&2; exit 1; }
[ -d "$shared/data" ] || { echo "Missing $shared/data" >&2; exit 1; }

rm -rf lib/data .log
ln -s "$shared/data" lib/data
ln -s "$shared/log" .log
ln -s "$shared/.env" .env

node_modules/.bin/knex migrate:latest
# Temporary (#42): copy legacy content files into sqlite. Idempotent and never overwrites existing data.
# A failure must not block the deploy because reads still fall back to the files.
node lib/services/storage/backfill-cli.js || echo "Warning: content backfill failed, see output above" >&2
node -e "require('./serverConfig.js')"
