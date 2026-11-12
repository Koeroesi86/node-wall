---
name: deploy-check
description: Review a change for deploy safety (migrations, env, release layout) before merging to master. Use when touching migrations, .env.example, deploy/, or the deploy workflow.
---

Master pushes auto-deploy to the VPS; this is a read-only checklist. Do not ssh or run anything on the server without explicit user confirmation.

- Migrations: new files only, never edited; backward compatible with the previous release (rollbacks do not revert them); `migrations/migrations.test.ts` passes.
- Config: any new env var is in `.env.example`, the README production section, and (user action) the server's `shared/.env`.
- `deploy/pre-activate.sh`: still links `shared/data`, `shared/log`, `shared/.env`, then runs `knex migrate:latest` and loads `serverConfig.js`.
- Build output: `npm run build` succeeds and `dist/` contains new static assets (check `scripts/copy-assets.mts`).
- Workflow: secrets and variables only in the `production` environment; `required` job in `checks.yml` still depends on every job.

Report blockers first, then manual follow-ups for the user.
