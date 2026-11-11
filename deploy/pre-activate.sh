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
ln -sfn ../lib node_modules/lib

node_modules/.bin/knex migrate:latest
node -e "require('./serverConfig.js')"
