# Wall

The community building platform.

## Dependencies

* [Node](https://nodejs.org/en/)
* [Yarn](https://yarnpkg.com/lang/en/) (optional)

## Development

```bash
yarn
yarn dev
```

or with npm
```bash
npm i
npm run dev
```

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

`deploy/pre-activate.sh` links `shared/` into each new release, runs `knex migrate:latest` and loads `serverConfig.js` as a sanity check, all before the switch. Migrations are not reverted by a rollback, so keep them backward compatible.

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
