# CI-fast-affected: a pull request into a goal branch asks which suites it touches, too

26 November 2026, by a Goal 18 builder, on the lead's evidence that day, under the brief of `CI-m1-balance.md` (cut CI's wall-clock
time without weakening what a code change is checked by).

## The problem

Pull request #1088, into `goal/capxul`, changed `design/decisions/CX-payroll-tax.md`, `design/goals/16-capxul.md` and
`examples/capxul/doctypes.md`. It was not docs-only, since a Markdown file under `examples/` is not a doc (`tools/ci/docs-only.sh`:
an example's generated docs are Markdown, and the grid and the checks read them). It was fast (`tools/ci/scope.sh`: into a goal
branch, CI-integration B1). In run 45817218470 the three `prove-tests` shards ran in full, 9 to 10 minutes each on #1086's timings,
because the `changes` job asked `tools/ci/affected.sh` only on a pull request that was neither docs-only nor fast; on a fast one
`affected_prove` stayed at its default, true.

On a pull request into `main` the same change would have skipped them: `examples/capxul` is its own project, prove does not import
it, and `affected.sh` names the four projects prove's tests reach by path (`cli`, `acme`, `starter`, `wallets`). Nothing builds from
`doctypes.md` (`git grep doctypes.md`: the status page and a README only).

## The call

The `changes` job runs `affected.sh` on every pull request that is not docs-only, fast ones included. A fast pull request's
`prove-tests` then skip when prove is not affected, by the same rule as on `main` (B3), and `check` accepts the skipped shards on
the same flag. Nothing else moves: the e2e jobs already pass without their steps on a fast pull request, `check-static` and
`builder-paths` still run, and should `affected.sh` or its install fail, `changes` fails and every job runs.

The cost: about 40 seconds more in `changes` on a fast pull request (install and `nx graph`), on the path of `prove-tests` when they
do run.

## Not done, and why

- **Markdown under `examples/` as docs.** Not safe as a rule: `examples/*/generated/` holds generated Markdown docs that the grid and
  the checks compare byte for byte. `affected.sh` gets the same speed from the project graph without guessing.
- **`check-static` on a docs-only pull request** (6.5 minutes on #1086). It runs the lint, typecheck and tests of every project,
  and it is where the docs are linted (CI-docs-fast-path). Narrowing it means splitting the docs' own checks out of it, a change to a
  required check's coverage that wants its own measurement. Left for a later slice.

## Supersedes

- .github/workflows/ci.yml: "A push, a docs-only or a fast pull request needs no answer." → "a push or a docs-only one needs no answer. A fast pull request (into a goal branch) asks too"
- design/decisions/CI-integration.md: "**Only the suites a change touches,** on pull requests into `goal/stage-1` and `main`" → "on every pull request that is not docs-only, fast ones included (CI-fast-affected)"
