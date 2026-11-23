# rules

The `ortho/*` oxlint rules: what the types can't see. `no-name-as-string`, `refusal-has-log`,
`declared-errors-only`, `no-wall-clock`, `handler-matches-path`, `no-viem-outside-chain`, `no-ui-in-worker` (K19: nothing a Worker bundles imports `react`, `@orthograph/portal-ui` or HeroUI; on for `generated/` and the portal's server half, off for its client), `no-pro-outside-portal-ui` (F7: only `@orthograph/portal-ui` imports HeroUI Pro, said in the diagnostic itself, which the GitHub reporter keeps where it drops `no-restricted-imports`' help) and `no-old-names` (the framework's old names, gone
since M0 and K6, mapped in `design/naming.md`; this repository's own lint runs it too). Rules get no type information, so `ortho
check` writes the project's declared names and each handler's errors into one options object (`ProjectFacts`) from
the model. Three are warnings, for a blueprint that grew past a handler that is already the project's (M1.26, K16 f):
`required-step-used`, `outcome-chosen` (an outcome of a move with more than one that no `move("…")` names; a `move(x)`
whose argument is not literal is not judged) and `declared-error-named` (a declared error the handler never names).
`no-edited-output` is check's drift step: a generated file differing from what the blueprint renders.

The repository's own code rules, `effect-only`, `max-lines` and `six-slots`, judge `packages/*/src` by path from
oxlint's cwd and tolerate the breaches their baseline lists (`internal/baselined.ts`; `packages/lint/README.md`).
