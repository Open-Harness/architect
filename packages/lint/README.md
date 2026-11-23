# @orthograph/lint

Oxlint rules for what types can't see. Arrives in layer 1; see the package map in `docs/canon/status.md`. Two sets live here:

- **The project rules** (`no-name-as-string`, `refusal-has-log`, `declared-errors-only`, `no-wall-clock`,
  `handler-matches-path`), which `ortho check` runs on a user's project with its `ProjectFacts`.
- **The repository's own code rules**, which this repository's `.oxlintrc.json` runs on `packages/*/src` (AGENTS.md,
  "The code's own rules"; `design/decisions/P1-code-rules.md`):
  - `ortho/effect-only`: no `async`, `await`, `try`, `throw`, `Date.now`, `new Date()`, `setTimeout`/`setInterval` or
    plain `Effect.sleep`, except in a package's `src/main.ts`, a test file, and the paths listed in the rule's `entries`.
  - `ortho/max-lines`: at most 250 lines of code in a source file, blank lines and comments aside.
  - `ortho/six-slots`: every `src/modules/<name>/` holds `README.md`, `types.ts`, `service.ts`, `internal/` and
    `<name>.test.ts`.
  - and `no-old-names`, the framework's old names.

  They judge a file by its path from oxlint's working directory, so run oxlint from the repository's root (nx does);
  run elsewhere, they judge nothing. They read names, not values: a computed form such as `Date["now"]` is not caught.

## The baseline

The code rules arrived after the code, so each starts from a baseline of the breaches that already existed:
`baseline.json`, rule by rule, file by file, with a count. In a file, a rule reports nothing while its breaches are at
most the baseline's count, and reports all of them once there is one more. A six-slots entry is a module's folder,
since the rule is about the module, not about the file it reports on. So lint fails only on new breaches.

The baseline only shrinks:

- `nx run lint:lint` (and so CI's `check` job) runs `scripts/baseline.ts`, which lints package source with the
  baselines off and compares. It fails on a new breach, and it fails on a **stale** entry: a file with fewer breaches
  than its count, because someone fixed one.
- `pnpm nx run lint:baseline` lowers every entry to what is left and drops the ones at zero. It never adds or raises
  an entry: a new breach is fixed, not listed. Commit `baseline.json` in the pull request that fixed the breach.
- `node packages/lint/scripts/baseline.ts --seed` rewrites the file from today's counts. Use it only when a new code
  rule arrives, or when a branch takes the rules in for the first time (a merge of `main`), and say so in the pull
  request.

When `baseline.json` is `{}`, the rules are plain errors and the baseline (and this section) can go.
