# Wall (uzenofal)

TypeScript Node 24 app (sqlite via knex, server-rendered pages, jsdom-run browser code) served by `@koeroesi86/node-webserver-cli`. Compiles to `dist/`; production runs from `dist/`.

## Commands

Node 24 comes from nvm and is not on the default shell PATH. Prefix shell commands once per call:
`export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH && <cmd>` (check `ls ~/.nvm/versions/node` if the version moved).

| Task | Command |
| --- | --- |
| Type check (all 4 tsconfigs) | `npm run typecheck` |
| Tests | `npm test` — one file: `npx vitest run path/to/file.test.ts` |
| Build | `npm run build` (needed before `npm run dev`; `dev` already builds) |
| Migrations | `npm run knex -- migrate:latest` |

Run the narrowest check that covers your change; run full `typecheck` + `test` once before committing.

## Layout

- `lib/services/<name>/index.ts` — service; SQL in `queries/*.ts`, one function per file.
- `lib/templates/` — HTML (`page/`) and email templates.
- `lib/utils/`, `lib/translations/en-GB|hu-HU/*.json` (one key per file).
- `public/index.ts`, `public/api/` — server entry points; `public/static/` — browser code (compiled by its own tsconfig).
- `migrations/` — knex; must stay backward compatible (rollback does not revert them).
- `dev.configuration.ts`, `serverConfig.ts` — webserver config. `.env.example` lists config.
- `deploy/pre-activate.sh`, `.github/workflows/` — deploy to VPS via deploy-action; `checks.yml` ends in one `required` job.

## Conventions

- Tests sit next to the code as `*.test.ts` (Vitest). Query tests use `lib/test-utils/fakeDb.ts`; service tests `vi.mock` their `queries/*`; browser code tests use `lib/test-utils/browser.ts`. See the `write-unit-test` skill.
- New user-facing text: add translation JSON files for every language dir.
- Config changes: update `.env.example` and README.
- Never read or print `.env`, `dist/`, `node_modules/`, `package-lock.json`, `lib/data/`.
- Branch from `master`, open PRs with `gh pr create` using `.github/pull_request_template.md`. Merging needs the `Required checks` job green.

## Working efficiently

- Search with Grep/Glob and read only the line range you need; do not read whole large files or lockfiles.
- Edit with the Edit tool, not `python3`/`sed -i` heredocs.
- Batch independent commands in one call. Don't re-run a passing check without changing code.
- CI logs: `gh run view <id> --log-failed | tail -60`, never the full log. Use the `ci-triage` skill.
- Do not poll with `sleep`; use `gh run watch <id> --exit-status` or Monitor.
- Prefer a small, focused diff; skip unrelated refactors and drive-by docs.
- Use subagents only for broad multi-file searches, not for single lookups.
- Production/VPS actions (ssh, deploy, migrations on the server) need explicit user confirmation each time.
