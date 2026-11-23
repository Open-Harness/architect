# CI-main-required: `main` requires the M1 checks

23 November 2026. Aaron's written yes, to the conductor: "Yes", answering "Shall I make these four checks required on
main, yes or no?"

## The problem

The preview (K28, #602) brought Gate M1's jobs to `main`'s `ci.yml`, but `main`'s branch protection still named the five
checks it had before: `check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0` and `builder-paths`. `portal-ui`, `e2e-m1`,
`e2e-climb` and `e2e-grid` ran on every ready pull request into `main` and could fail without blocking its merge, so a
pull request could break Gate M1 on `main` and still land. `goal/stage-1` already required all four.

## The call

`main` requires nine checks, `goal/stage-1`'s ten without `e2e-stage1`:

```json
["check","e2e-layer1","e2e-layer2","e2e-m0","builder-paths","portal-ui","e2e-m1","e2e-climb","e2e-grid"]
```

Set by the conductor on 23 November 2026 with
`gh api -X POST repos/Open-Harness/orthograph/branches/main/protection/required_status_checks/contexts` and the four
names. `strict` stays `false` and the rest of `CI-branch-protection.md` stands.

## Evidence

- **No run gets slower.** The four already run on a ready pull request into `main`; requiring one only lets its failure
  block the merge. In `main`'s run on the preview merge (45114764693) the longest jobs were the `e2e-m1` shards (8.1 to
  15.3 minutes) and `prove-tests` (8.1 to 9.8); `portal-ui` took 1.1, `e2e-climb` 2.4, `e2e-grid` 2.2 and `e2e-m1`, the
  join of the shards, 1.4.
- **They keep the required-job rules.** `main`'s `check-static` already runs `tools/ci/required-jobs.sh` over all four
  (`.github/workflows/ci.yml`), so none skips on a ready run. On a docs-only pull request `e2e-m1`, `e2e-climb` and `e2e-grid` pass without
  their steps (CI-docs-fast-path); `portal-ui` runs its steps there and skips them only for a fork. No pull request into
  `main` is fast (`tools/ci/scope.sh`).
- **They are not redundant.** `e2e-m1` is Gate M1 (the ratchet over its four shards), `portal-ui` builds the portal
  client the shards and the grid read (K19), `e2e-climb` checks that a failing journey is explained (`e2e/climb/README.md`)
  and `e2e-grid` runs each capability on each example (`e2e/grid/README.md`).

## Undoing it

```bash
gh api -X DELETE repos/Open-Harness/orthograph/branches/main/protection/required_status_checks/contexts --input <(echo '{"contexts":["portal-ui","e2e-m1","e2e-climb","e2e-grid"]}')
```

## Supersedes

- .github/workflows/ci.yml: "`builder-paths`, and on goal/stage-1 also `portal-ui`," → "`builder-paths`, `portal-ui`, `e2e-m1`, `e2e-climb`,"
