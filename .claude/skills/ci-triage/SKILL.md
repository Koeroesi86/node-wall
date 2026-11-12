---
name: ci-triage
description: Diagnose a failing GitHub Actions run or PR check cheaply. Use when CI, CodeQL, dependency review or deploy fails.
---

Never dump a full log.

1. Find the run: `gh pr checks` (current PR) or `gh run list --limit 5`.
2. Which job failed: `gh run view <id> --json jobs --jq '.jobs[] | select(.conclusion=="failure") | .name'`.
3. Just the failure: `gh run view <id> --log-failed 2>&1 | tail -60`. Narrow further with `grep -nE "error|Error|FAIL|✗"` if still long.
4. Reproduce locally with the matching npm script (`typecheck`, `build`, `test`) from `.github/workflows/checks.yml`.
5. Dependency review failures: read the offending advisory only (`gh run view <id> --log-failed | grep -i -B2 -A6 severity`).
6. After pushing a fix, wait with `gh run watch <id> --exit-status` — no `sleep` loops.

Report: failing job, root cause in one line, fix.
