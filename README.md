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

### Generated Zod schemas

`npm run generate:schemas` runs the TypeScript migrations against a in-memory SQLite database and writes one Zod schema plus its inferred type per application table to `lib/data-schemas/` (kebab-case files, `index.ts` re-exports them; knex and `sqlite_*` tables are skipped). Columns without `NOT NULL` are `.nullable()`. It needs no `.env` or existing database. The folder is gitignored and regenerated automatically before `npm run build`, `npm run typecheck` and `npm test`. Queries that select explicit columns validate their rows with these schemas, and inserts and updates validate the values they write, (`lib/utils/validateRows.ts`) and throw if a row does not match; timestamp columns are validated with `TimestampSchema` because column defaults are stored as text while the app writes epoch milliseconds.

The app is written in TypeScript and runs from `dist/`, which `npm run build` produces (compiled code plus the CSS, translations and media it needs). Put your `.env` in the project root or in `dist/`. `npm run clean` removes `dist/`, including any local data under `dist/lib/data`.

## User roles

New accounts get the `user` role. Admins promote and demote other users from the users list on the moderation page. The first admin has to be set directly in the database: `UPDATE users SET role = 'admin' WHERE id = '<user id>';`. Existing accounts keep their current role (there is no migration), so demote any that should not be admins from the moderation page.

## Deployment

Pushes to `master` build the app in GitHub Actions and ship it with [deploy-action](https://github.com/Koeroesi86/deploy-action) to `/var/www/uzeno.koro.si` on the VPS. The shared `webserver` service (`/var/www/server/configuration.js`) serves it from `build/serverConfig.js` behind Apache, which proxies `uzeno.koro.si` to port 8000.

```
/var/www/uzeno.koro.si/
  build -> build.<timestamp>   active release (managed by deploy-action)
  shared/.env                  production config, see .env.example
  shared/data/                 wall.sqlite (all content lives in it; the legacy post/link/comment/session files are no longer used)
  shared/log/
  .deploy-log
```

The deploy workflow builds `dist/`, installs production dependencies into it with `npm ci --omit=dev` and ships that folder as the release. `deploy/pre-activate.sh` links `shared/` into each new release, runs `knex migrate:latest` and loads `serverConfig.js` as a sanity check, all before the switch. Migrations are not reverted by a rollback, so keep them backward compatible.

Rate limits (login, posts, comments) are stored in sqlite and keyed on the client address. Apache must send `X-Forwarded-For` (`mod_proxy` does by default); it is trusted only when the direct peer is in `TRUSTED_PROXIES` (default loopback, see `.env.example`).

Pages send a CSP (`default-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`; styles and fonts also from Google Fonts, images from any https host for link previews), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS (`lib/utils/securityHeaders.ts`). Apache does not need to add them; if it also sets HSTS, keep the values identical. Pages and API responses use `Cache-Control: private, no-store`. Inline `style` attributes are not allowed; use CSS classes or the `hidden` attribute.

Account deletion and data export (GDPR) are on the profile page. Deleting needs a code emailed to the login address (10 minutes, 5 attempts) and removes the user, logins, sessions and tag preferences; posts and comments they wrote are kept with the owner cleared. The export is JSON (profile, logins, sessions without ids or secrets, tag preferences, posts and comments). Both are recorded in the `audit_log` table (action and user id only).

Admin actions (role changes, post status changes, tag creation, tags added to or removed from posts) are recorded in `audit_log` with the actor, action, target id and a per-request id. The newest 50 admin entries (not the users' own `account.*` events) are listed with the actor's name on the moderation page (`GET /api/users/audit`, admins only). Entries older than a year are purged by the hourly scheduler.

### Data retention

There is no privacy notice yet, so the retention periods live here and must be copied into it when it is written. A scheduler in the webserver's main process (`lib/scheduler`, started from `serverConfig.ts`) runs the purges one minute after start and then hourly, independent of traffic. No cron job is needed.

| Data | Kept | Then |
| --- | --- | --- |
| Pending (never verified) sessions | 24 hours | row deleted |
| Users and logins without a verified session | 24 hours | deleted |
| Active sessions | 30 days maximum, 7 days idle | marked deleted, secret cleared |
| Session user agent and remote address | 30 days after the session's last activity once it is deleted | both set to `NULL` |
| Deleted sessions | 90 days after their last activity | row deleted; the login keeps its `verified_at` so the account is not mistaken for an unverified one |
| `audit_log` entries | 1 year | deleted |
| Rate limit counters | until their window expires | deleted |
| Account deletion confirmations | 10 minutes | deleted |
| Server logs (`shared/log`) | not rotated by the app | rotate and delete them on the server (for example with `logrotate`, 30 days); logs hold session ids but no email addresses or login codes in production |
| Account data | until the user deletes the account (profile page) | removed, see above |

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

### Content storage migration

Post, comment and link content is stored in the `contents` table; session device details (user agent, remote address) are columns on `users_session`. Content used to be one file per record under `lib/data`; the files are no longer read or written, so `shared/data` only needs to hold `wall.sqlite`. Releases no longer link `lib/data`; production reaches the database through the absolute `DB_DATABASE` in `shared/.env`.
