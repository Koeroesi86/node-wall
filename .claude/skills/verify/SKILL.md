---
name: verify
description: Run the cheapest checks that prove a change works in this repo (typecheck, targeted tests, full suite before commit). Use after editing code, before committing or opening a PR.
---

Node 24 needs `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` first.

1. Find changed files: `git diff --name-only master...HEAD; git diff --name-only`.
2. Run only related tests: `npx vitest run <changed test files or the *.test.ts beside changed sources>`.
3. Once, when edits are done: `npm run typecheck && npm test` in a single call.
4. If something fails, show only the failing test name and assertion (`2>&1 | tail -40`), fix, rerun just that file, then the full pair once more.
5. If `public/static`, translations or `scripts/` changed, also run `npm run build`.

Report: what ran, pass/fail, nothing else.
