---
name: write-unit-test
description: Write a Vitest unit test for a file in this repo using the existing helpers (fakeDb, vi.mock of queries, jsdom browser harness). Use when adding or changing code that needs tests.
---

Tests live beside the source as `<name>.test.ts`. Imports come from `vitest` explicitly (`test`, `expect`, `vi`, `beforeEach`). Copy the style of a sibling test rather than inventing one.

- **`services/*/queries/*.ts`**: one shared `*-queries.test.ts` per service. Mock `utils/createDatabase` to return `fakeDb.knex`, `beforeEach(() => fakeDb.reset())`, set results with `fakeDb.resolves` / `resolvesInOrder` / `rejects`, assert on `fakeDb.calls`. Reference: `lib/services/tag/queries/tag-queries.test.ts`.
- **`services/*/index.ts`**: `vi.mock('./queries/<x>')` for every query, `vi.resetAllMocks()` in `beforeEach`, mock `uuid` for stable ids. Reference: `lib/services/tag/index.test.ts`.
- **`templates/`**: assert on rendered HTML with `toContain`; mock `uuid`. Reference: `lib/templates/page/pages.test.ts`.
- **`public/static` browser code**: use `lib/test-utils/browser.ts` / `components.ts` / `reduxStub.ts`.
- **utils**: plain input/output tests; mock only fs/network.

Rules: no real network, DB or filesystem writes; cover success, empty and error paths; keep each test to one behaviour. Run `npx vitest run <file>` only, not the whole suite.
