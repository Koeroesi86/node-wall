#!/usr/bin/env bash
# Runs on the server inside the new release, before deploy-action switches the symlink.
# Links the state that must survive releases, applies migrations and checks the server config.
# /var/www/uzeno.koro.si/shared is created once by an admin (see README), owned by www-data and group writable.
set -euo pipefail

umask 002
shared="$(cd .. && pwd)/shared"

[ -f "$shared/.env" ] || { echo "Missing $shared/.env" >&2; exit 1; }
[ -d "$shared/data" ] || { echo "Missing $shared/data" >&2; exit 1; }

rm -rf .log
ln -s "$shared/log" .log
ln -s "$shared/.env" .env

# The database is no longer reached through a lib/data symlink, so .env must point at the real file.
db="$(sed -n 's/^DB_DATABASE=//p' .env | tr -d "\"'")"
[ -f "$db" ] || { echo "DB_DATABASE in $shared/.env must be the absolute path of an existing sqlite file, got: ${db:-<unset>}" >&2; exit 1; }

node_modules/.bin/knex migrate:latest
node -e "require('./serverConfig.js')"
