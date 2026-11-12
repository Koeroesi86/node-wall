# Wall

The community building platform.

## Dependencies

* [Node](https://nodejs.org/en/) 24 or newer, with npm

## Development

```bash
npm ci
npm run build   # TypeScript -> dist/
npm run typecheck
npm test        # runs the *.test.ts files with Vitest (npm run test:watch, npm run test:coverage)
```

The app is written in TypeScript and runs from `dist/`, which `npm run build` produces (compiled code plus the CSS, translations and media it needs). Put your `.env` in the project root or in `dist/`. `npm run clean` removes `dist/`, including any local data under `dist/lib/data`.

## User roles

New accounts get the `user` role. Admins promote and demote other users from the users list on the moderation page. The first admin has to be set directly in the database: `UPDATE users SET role = 'admin' WHERE id = '<user id>';`. Existing accounts keep their current role (there is no migration), so demote any that should not be admins from the moderation page.

## Deployment

Pushes to `master` build the app in GitHub Actions and ship it with [deploy-action](https://github.com/Koeroesi86/deploy-action) to `/var/www/uzeno.koro.si` on the VPS. The shared `webserver` service (`/var/www/server/configuration.js`) serves it from `build/serverConfig.js` behind Apache, which proxies `uzeno.koro.si` to port 8000.

```
/var/www/uzeno.koro.si/
  build -> build.<timestamp>   active release (managed by deploy-action)
  shared/.env                  production config, see .env.example
  shared/data/                 wall.sqlite and the post/link/session/comment files
  shared/log/
  .deploy-log
```

The deploy workflow builds `dist/`, installs production dependencies into it with `npm ci --omit=dev` and ships that folder as the release. `deploy/pre-activate.sh` links `shared/` into each new release, runs `knex migrate:latest` and loads `serverConfig.js` as a sanity check, all before the switch. Migrations are not reverted by a rollback, so keep them backward compatible.

Production `.env` needs `SERVER_PROTOCOL=http`, `SITE_PROTOCOL=https`, `SITE_DOMAIN=uzeno.koro.si`, an absolute `DB_DATABASE=/var/www/uzeno.koro.si/shared/data/wall.sqlite` and `APP_ROOT=/var/www/uzeno.koro.si/build`.

One-time server migration (as root), from the old flat checkout:

```bash
cd /var/www/uzeno.koro.si
mkdir -p shared/log
mv lib/data shared/data && mv .env shared/.env
# edit shared/.env as described above
chown -R www-data:www-data shared && chmod -R g+rwX shared && find shared -type d -exec chmod g+s {} +
touch .deploy-log && chown deploy:www-data .deploy-log && chmod g+w .deploy-log
```

Then add `/var/www/uzeno.koro.si/build/serverConfig.js` to `servers` in `/var/www/server/configuration.js` (after the first deploy), check with `nws-cli --config /var/www/server/configuration.js --check` and restart `webserver`. The old checkout files can stay beside the releases until the first deploy has been verified, then be removed.

In the GitHub `production` environment set the variables `DEPLOY_HOST`, `DEPLOY_USER` and the secrets `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.
