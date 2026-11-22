# M7.03 and M7.04: the infra projection is an Alchemy stack, generated into `generated/infra`

Decided 21 November 2026 by the building agent of M7.03 and M7.04, under "Who decides" in `AGENTS.md`.

## The call

`ortho env up staging --run <id>` and `ortho env destroy staging --run <id>` deploy and destroy through an **Alchemy stack generated from
the model**, `generated/infra/alchemy.run.ts`, by the new `infra` projection (`packages/projections/src/modules/infra`).

Aaron, 21 November 2026: "Remember, we're using Alchemy." D3 #5 and `design/frame/deployment.md` already said it: `generated/infra` gains
the Alchemy stack, deploying the same bundle, when the cloud pass turns the destination on. An earlier draft of this decision chose wrangler
and the REST API instead, on the reading that `M7-cloud.md` never names Alchemy. That was a gap in `M7-cloud.md`, not a decision, and the
draft is replaced here; it was never merged.

## What it is

- **One plan.** `packages/cli/src/modules/staging/internal/plan.ts` makes the plan from the compiled model, the project's name
  (`ortho.config.ts`), the environment and the run. `--plan` prints it; `up` and `destroy` run the same function. The prefix is formed
  there and nowhere else, and every name is the prefix or continues it past a dash. Check 37 reads this and nothing about the tool.
- **The stack** holds what the model decides: the database bindings and each one's migrations folder, the Durable Object classes and their
  bindings, the compatibility settings. What a run decides, the plan's names and the bundle's path, it reads at run time from the file
  `ORTHO_STAGING_INPUT` names, which `up` writes to `.ortho/staging/<prefix>/stack-input.json`. So the stack's resource names are the plan's,
  and the generated file holds none (a test says so). The secret `AUTH_SECRET` is a fresh random value, handed over in the process's
  environment (`ORTHO_AUTH_SECRET`), never on a command line, bound by Alchemy as a secret.
- **`up`** builds the bundle once (`Build.build`, no credential), writes the input, and runs `alchemy deploy <stack> --stage <prefix> --yes`
  in `.ortho/staging/<prefix>/`. Alchemy makes each D1 database and applies its migrations (`Cloudflare.D1.Database`, `migrations`), uploads
  the prebuilt bundle unchanged (`bundle: false`), binds the databases and the Durable Object namespaces (it drives their migration), turns
  `workers.dev` on and previews off, and sets the secret. The 10007 retry (spike snag 11) and the wait for three good answers (snag 10) stay.
- **State is local** (`State.localState()`, in `.ortho/staging/<prefix>/.alchemy/`), not `Cloudflare.state()`: that store deploys a shared
  state Worker, a Durable Object and a secrets store into the account, and none of them carries a run's prefix.
- **`destroy`**, in this order: when the run's Alchemy state and input are here, `alchemy destroy` first; then, always, the sweep. The sweep
  lists the account's Workers and D1 databases and deletes those whose name is the prefix or continues it past a dash (`owns`, the only filter).
  The sweep works alone, with no Alchemy state and no file: a destroy in another job than the `up`, after a cancelled run, has neither
  (Alchemy's destroy with no state reads nothing and plans no changes), and still leaves nothing; a failed Alchemy destroy is said, with
  its words cut to 300 characters and redacted, and the sweep goes on. A test runs destroy with no state against an account holding
  this run's Worker and databases and another run's, and only this run's go.
- **The async boundary** is Alchemy's own process. The CLI starts `alchemy` with `spawnSync` inside `Effect.try` (`internal/live.ts`) and
  reads its status and words; the generated stack is an Effect program (`Effect.gen`) with no `async`, `await`, `try` or `throw`. The REST
  listings of the sweep go through `Effect.tryPromise` in `internal/cloudflare.ts`, as before.
- **Credentials** are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, read by `main.ts` alone; Alchemy reads the same two from its
  environment. Without them both verbs exit 2 and open no connection. Errors are redacted and cut to 300 characters.

## The pin, and what it cost

`alchemy` and `@alchemy.run/cloudflare` at `2.0.0-beta.87`, exact, published 12 November 2026 (nine days old; `npm view alchemy time --json`).
`latest` is this beta line; the last 0.x release (0.94.0, 1 August) is the older, non-Effect API. Every transitive version was at least
three days old when installed (`@distilled.cloud/cloudflare` rc.20 and `@alchemy.run/*` beta.87 on 12 November), so no entry in
`minimumReleaseAgeExclude` is needed. The two packages peer-depend on `effect ^4.1.4`, so the pins of `effect`, `@effect/platform-node` and
`@effect/sql-d1` move from 4.1.1 to 4.1.4 (4.1.4, published 11 November 2026) in every package and example. Alchemy v2 is a weekly-changing beta (R1): the exact pin is what
keeps it still, and a bump is a decision of its own.

## Alchemy is a beta, and `state()` is avoided

Alchemy 2.0.0-beta.87 is a beta, pinned exactly (no range, no caret). We move off it at its 2.0 release, as a decision of its own. `Cloudflare.state()` is
avoided on purpose: the stack keeps Alchemy's local state under the run's folder and the sweep never depends on it. The destroy sweep tries every delete,
Workers and databases, and only then reports the failures together (exit 1), so one failed Worker delete does not leave the databases behind. The deploy
failure message redacts the token, the account id and the Worker's random secret.

## Not done here

The real deploy has not been run: it waits for the hand-run staging workflow and the lead's go, so the stack has been type-checked against
Alchemy's types and its generated shape tested, but not run against Cloudflare. `ortho prove --env staging` is another slice. The portal's
client is not part of the staging Worker (snag 5).

## Supersedes

- design/frame/deployment.md: "applied by `promote` in the cloud pass" → "staging runs it with `ortho env up|destroy staging --run <id>` (M7.03, M7.04), the other environments by `promote` in the cloud pass"
- design/frame/deployment.md: "the cloud pass, `ortho env destroy <name>` removes its Alchemy stack." → "the cloud, `ortho env destroy <name> --run <id>` has Alchemy destroy its stack and then deletes whatever the run's prefix still owns."
- design/frame/deployment.md: "Alchemy deferred to the cloud pass (D3 #5)" → "the Alchemy stack in `generated/infra` for staging (D3 #5, M7-03)"
- design/frame/projections.md: "D3 #5 deferred Alchemy to the cloud pass. Wrangler configs live in `.ortho/environments/` (D3 #17)." → "the `infra` projection writes the Alchemy stack to `generated/infra/alchemy.run.ts` (M7-03), run by `ortho env up|destroy staging --run <id>`; the local environments keep their wrangler configs in `.ortho/environments/` (D3 #17)."
- design/frame/generators.md: "wrangler configs under `.ortho/environments/` (D3 #17) | the cloud pass |" → "`generated/infra/alchemy.run.ts` for staging (M7-03); wrangler configs under `.ortho/environments/` for the local environments (D3 #17) | the cloud pass, for the other environments |"
