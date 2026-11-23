# CI-docs-inert: design/grid is not a doc, and paths no gated suite reads are

23 November 2026, by the CI builder, on the conductor's ask the same day, after `CI-e2e-suites.md` measured the saving.

## Two changes to `tools/ci/docs-only.sh`

1. **A change under `design/grid/` is not docs-only.** `e2e/grid/src/modules/project-evals/project-evals.test.ts:14` reads
   `design/grid/grid.json` (the grid's matrix), yet the script counted every path under `design/` as a doc, so a pull request that
   changed the matrix skipped `e2e-grid`. That was a missed check, not a saving. (`goal/stage-1` only: `main` has no `e2e/grid`.)
2. **These paths count as docs-only, and a pull request that touches only them and docs skips the gated suites:** `spikes/`,
   `.agents/`, `.claude/`, `.codex/`, `.pi/`, `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`, `skills-lock.json`
   and `.mcp.json`. `check-static` and `e2e-m0` still run, as for any docs-only pull request. The saving is about 4% of e2e runner
   minutes (CI-e2e-suites.md, row 2).

## The greps (23 November 2026)

For each branch, what in `e2e`, `packages`, `examples`, `tools` and `docs` (outside `node_modules` and the markdown pages) names a
candidate path, so that a suite could read it:

```bash
for br in origin/main origin/goal/stage-1; do
  for pat in 'spikes' '\.agents' '\.claude' '\.codex' '\.pi/' 'ISSUE_TEMPLATE' 'pull_request_template' 'skills-lock' '\.mcp\.json' '\.verdaccio'; do
    git grep -lIE "$pat" $br -- e2e packages examples tools docs ':!**/node_modules/**' ':!**/*.md' ':!design/**'
  done
done
git grep -nIE "[\"'\`]design[\"'\`/]" $br -- e2e packages examples tools docs ':!**/node_modules/**' ':!docs/canon/**'
git grep -nF -e .agents -e spikes -e .claude -e .codex -e ISSUE_TEMPLATE $br -- .github/workflows
```

What they found, and why each path is safe:

| Path | Who names it | Gated? | Verdict |
|---|---|---|---|
| `spikes/` | `docs/canon/check.mjs:187` reads `spikes/visual-content/scenes/`; `e2e/m0/names.test.ts` treats it as a record; `packages/orthograph/test/invariants.test.ts:46` scans it. Other hits are comments, or the lint config, or `e2e/m1` code that skips it | `canon:check` and `e2e-m0` always run; `check-static` runs `orthograph`'s tests | inert for the gated suites |
| `.agents/` | `docs/canon/components/types.ts:54` (a comment); `e2e/m1/15-portal-ui-seam.test.ts` (an allow-list: it scans tracked files, see below) | no | inert, with the check-15 guard below |
| `.claude/` | `e2e/m0/names.test.ts` (a record path) | `e2e-m0` always runs | inert |
| `.codex/` | `tools/evidence/page_test.py` (a string) | no | inert |
| `.pi/`, `ISSUE_TEMPLATE`, `pull_request_template`, `skills-lock`, `.mcp.json` | none | | inert |
| `.verdaccio/` | none by name, but layer 2 runs a local registry, so it is **left out** | | not added |
| `design/grid/` | `e2e/grid/.../project-evals.test.ts:14` reads `grid.json` | `e2e-grid` | **not docs** (change 1) |
| the rest of `design/` | `e2e/m0` and `docs/canon/check.mjs` read it; no gated suite does (`e2e/climb` writes `design/evidence/climb/runs.jsonl`, an output) | `e2e-m0`, `canon:check` always run | still docs |

`tools/ci/docs-only.sh` and nothing in `.github/workflows/` names any candidate path, so no workflow reads them either.

**Check 15 guard.** `e2e/m1/15-portal-ui-seam.test.ts` scans every tracked file for `@heroui-pro` (it exempts `spikes/`, `design/`,
`docs/`, `*.md`, and a few config paths, but not the agents' or editor config). The script already sends a pull request that names a
path for Pro or adds `HEROUI_AUTH_TOKEN` to the full run; on `goal/stage-1` (where check 15 and the M1 shards live) it now also
sends one that adds a line naming HeroUI Pro in one of the new paths.

## Reversibility

One commit per workflow reverts it; the lists are two `case` arms in one script.

## Supersedes

- tools/ci/docs-only.sh: "Docs-only: every changed path is under design/, or is a *.md file outside" → "Docs-only: every changed path is under design/ (but not design/grid/, which e2e/grid reads), or is a *.md file outside"
- .github/workflows/ci.yml: "Docs-only is every changed path under design/, or a *.md file outside packages/, e2e/ and examples/" → "Docs-only is every changed path under design/ (but not design/grid/), a *.md file outside packages/, e2e/ and examples/,"
