# Goal 1: the whole framework, proven locally

## The prompt

> You are the builder of Architect, in `~/projects/architect`. First read `design/handoff.md` to see where things stand.
> Then read `AGENTS.md`, this file, `design/decisions.md` and `design/decisions/`, `design/build-plan.md`,
> `design/packages.md`, the wayfinding notes in `design/wayfinding/`, and the worked example in
> `design/docs/index.html`.
>
> Carry on from where the handoff says. Build all six stages below in order, each working on top of the last.
>
> - **Wayfinding:** open every stage with it. Research in parallel subagents, spike what research can't settle, then
>   decide.
> - **The loop:** for each step, write its check first, then generate, run and fix until the check passes.
> - **Real services:** run everything for real on this Mac, and never mock a service.
> - **Separate authors:** have a separate subagent write each stage's journeys and planted fixtures before you build.
> - **Evidence:** capture it after every step, and republish the evidence page.
> - **Landing:** land each stage on `main` after a 🔍 reviewer subagent passes it.
> - **Ownership:** you own the architecture. Decide, record, fix inconsistencies and keep going.
> - **The handoff:** keep `design/handoff.md` current after every commit, so a fresh or compacted session continues
>   exactly where you stopped.
>
> Stop only when every gate passes locally and in CI, or when you're blocked as `AGENTS.md` defines it.

## The bound

All five layers of the build plan, running for real on this Mac, with no key and no cloud account.

**Local, never fake (Aaron, 16 November 2026).** Every service actually runs: a real Worker in workerd (the open-source
runtime Cloudflare's own edge runs), a real D1 database (SQLite, through workerd's D1), real Durable Objects with
their own storage and alarms, real R2, and a real EVM node. No hand-written fakes, mocks or in-memory shims of any
Cloudflare API, chain or service, in tests or in `prove`. A test that needs a Worker runs inside workerd. If something
can't run for real locally, say so in `decisions/`, and leave it for the cloud pass. Never fake it.

| Cloud piece | What runs locally (the real thing) |
|---|---|
| Workers, Durable Objects, alarms, D1, R2 | workerd, through `wrangler dev` and `@cloudflare/vitest-pool-workers`, with state persisted to disk |
| Environments (test, staging, production) | A separate running deployment each: its own workerd process, persisted D1 and Durable Object storage, port and secrets |
| Alchemy infrastructure | Alchemy itself, applied to the local runtime if it supports that (a wayfinding question); otherwise wrangler's local deploy, with the Alchemy stack generated and planned |
| Containers for benches | Cloudflare Containers through `wrangler dev`, on local Docker |
| The chain | Anvil (a real EVM node) and Foundry |
| npm and Homebrew | Verdaccio (a real npm registry) and a real local tap repository that `brew install` uses |
| GitHub's OIDC token for verdicts | A real OIDC issuer running locally that signs real JWTs, and GitHub Actions' own token in CI |
| Axiom, the OTLP sink | A real OpenTelemetry Collector and trace store in Docker, receiving OTLP from the Workers |
| OAuth for the MCP server and Better Auth | Both running for real inside the local deployment |

**Not in this goal (the cloud pass, later and with Aaron's yes on credentials):** real Cloudflare deploys, publishing
to the real npm and Homebrew, Axiom, and sign-in on a real staging host. Everything is built so that each of these is a
config change, not new code.

## The rules that shape the stages

1. **Each stage ends with something that works,** shown by a short command session in its check, and it's built on
   the stage before it.
2. **Evals are wide from the start.** Stage 1 lands all nine layer-one evals, each with a planted fixture that it
   fails. From then on, every new primitive lands with its eval and its planted fixture in the same commit. The eval
   count never goes down.
3. **Journeys and checks come from another agent.** Before each stage's builder work, a subagent that writes no
   handlers writes that stage's journeys and planted fixtures. The builder never edits them.
4. **Gates run everywhere.** Each layer's gate is `nx run e2e:layer<n>`, green on a clean checkout locally and in
   GitHub Actions.
5. **Landing.** Work goes on `layer/<n>`, with one commit per build-plan step. A stage lands on `main` by a pull request
   once CI is green and a 🔍 reviewer subagent that wrote none of it passes it. Then the next layer branch is cut from
   `main`.

## Wayfinding comes first, in every stage

Building is about half the work. The other half is finding the way. Each stage opens with a wayfinding pass before
any of its build steps, and wayfinding comes back whenever a step meets something unknown.

1. **List the stage's unknowns:** each library, runtime or tool behaviour the stage depends on that nobody here has
   seen working yet.
2. **Research each one** from its source: the package's own docs, its source code and types at the pinned version,
   its changelog and issues. Read the code rather than trust memory, since versions move. Research runs in parallel
   in subagents, and each brings back an answer with links and the exact version.
3. **Spike what research can't settle,** in `spikes/<name>/`, with the `spike` skill: one question, throwaway code, a
   README with what was found. Several spikes can run at once.
4. **Decide and record** in `design/decisions/`, fold the results into the stage's steps, then build.

Write down what you learn where the next session will find it: in a decision, in a spike's README, or in the
package's `README.md`. Time spent finding the way isn't time lost. A wrong turn found in a spike costs minutes, and the
same wrong turn found in the build costs a stage.

### Stage 1's known unknowns (from checking versions on 16 November 2026)

- **Effect 4's shape.** Effect is at 4.1, but `@effect/platform` is still at 0.97, which suggests HTTP, HttpApi, the
  CLI and SQL have moved into `effect` itself (perhaps under `effect/unstable/*`). Find where HttpApi, the CLI, the SQL
  client and a D1 driver now live, and whether `@effect/vitest` 4 runs inside workerd.
- **TypeScript 7** (the native compiler) is the current stable. Check whether Nx 24, typescript-eslint and vitest work
  with it, or whether the workspace should pin TypeScript 6 for now.
- **The test runner in workerd.** Check which vitest versions `@cloudflare/vitest-pool-workers` 0.23 supports, and how
  it runs Durable Objects and D1.
- **Nx 24 sync generators and module boundaries,** and whether the boundaries rule needs ESLint, or whether oxlint can
  hold it. Oxlint is the project's linter for its own rules.
- **Real services locally:** whether Alchemy can apply a stack to the local runtime, how `wrangler dev` runs
  Containers on Docker, and how to get OTLP out of workerd into a local collector.
- **Pinned versions,** the newest published on or before 2 November 2026: nx 24.0.3, effect 4.1.1, wrangler 4.156.1,
  `@cloudflare/vitest-pool-workers` 0.23.0, vitest 4.1.12, oxlint 1.90.0, verdaccio 7.0.2, tsx 4.23.15.

## The stages

### Stage 1: the skeleton, with every eval

The allowance's first operation, `allowance.grant`, goes the whole way: declaration, model, generated api, server,
sdk and cli, served on Miniflare, called from the CLI, proven by a journey. The grant already has what every eval
needs: a machine (it enters `active`), an event (`AllowanceGranted`), a role, a step, a budget and declared errors.

Covers L1.01, D1 and D2, L1.10 to L1.15, and the grant's slice of L1.20 to L1.25. It also covers the grant's slice of
L1.30 and L1.31, because the authoring loop is the point. That means `Blueprint.todo` blanks, the generated
`grant.handler.ts` (what the handler is given), and the handler scaffold, written once with a blank and never
overwritten. The grant's handler is filled into that scaffold, not hand-written from nothing. Spikes S2, S4 and S5 are folded
into the build.

**Works when:** `acme allowance grant --to olga --limit 500` prints an id, `architect prove --env local` prints
`allowance.grant 9 evals ✔`, and each of nine planted fixtures makes it exit 1, naming the call and the eval.

### Stage 2: the allowance's whole life, which is Gate 1

Spend, revoke and get. Refusals with deciding logs, exit codes, roles, reads, idempotency, both owners (`database`
with a version column and `actor` as a Durable Object, with spike S3's race test), blanks and scaffolds, `brief`,
`check` with the lint rules (spike S6), docs output, `impact`, the starter preset with Better Auth, and acme built by
Architect's own commands.

Covers the rest of layer one. Check 4 of the gate is a scripted `claude -p` session given only
`architect brief allowance.spend`, with the journeys denied by its settings.

**Works when:** `nx run e2e:layer1` passes.

### Stage 3: ship it, across local environments, which is Gate 2

The pipeline runs across local worlds: the generated infrastructure, test worlds made and destroyed per run (in CI
too), the logbook as a Durable Object with signed verdicts, versions worked out from the model diff, staleness,
`promote` from staging to production with the same artefacts, publishing to Verdaccio and the local tap, the remote
MCP server with OAuth, `watch` on the local OTLP sink, and the portal.

**Works when:** `nx run e2e:layer2` replays walkthrough steps 9 to 12. A change goes from test to staging to
production with a verdict in each, `@acme/sdk` installs from Verdaccio at `architect version --next`, the tap formula
installs and runs, and an MCP client signs in with OAuth and calls `allowance.get`.

### Stage 4: the kits and the chain, which is Gate 3

The kit format (D4), `std/wallets`, `std/auth` with SIWE, `std/chain` on viem, Anvil as a bench in the world, the
relayer as an actor, simulation, the chain follower with reorgs, and EIP-7702.

**Works when:** `nx run e2e:layer3` passes: `acme wallet create` and `link` work with a local key, 100 relayed
submissions land with nonces 0 to 99 and no gaps, a forced reorg produces a correction, and acme has no hand-written
viem import.

### Stage 5: the allowance on chain, which is Gate 4

D5, target-solidity (types, the compiled machine, EIP-712 signatures, generated Foundry tests, the contract scaffold,
and the fuzz cross-check against the TypeScript machine), the contract's Effect client, the signing flow through the
relayer, worlds with a Safe per organisation, enabling the budgets module (K25), on Anvil, and contracts redeployed per local environment only when the
bytecode changes.

**Works when:** `nx run e2e:layer4` passes: `forge test` on the generated tests passes, the journeys pass on Anvil
with each person signing, the move to the chain is reported as a major version, and the no-key check holds.

### Stage 6: time, which is Gate 5

D6, a stepped clock that drives the chain, the alarms and the workflows; moves made by time in both targets; the
keeper with its own narrow key; durable workflows; and eval 10, on time.

**Works when:** `nx run e2e:layer5` passes: a journey moves a month and a year in seconds, reset and expire are both
`on time ✔`, a keeper delayed on purpose fails the eval, and coverage reads `moves 5/5`.

## The loop, for every step

1. Write the step's "done when" check first, as a test or script, and watch it fail.
2. Build, run, read the failure, fix. Repeat until it passes and every earlier check still passes.
3. Mark the step done in `build-plan.md` with its proof, update `handoff.md`, and commit.
4. **Stuck rule:** after three different failed approaches to one problem, answer it as a spike in `spikes/<name>/`,
   record the decision, and go back to the step. If a local stand-in can't do what a check needs, record that, check
   the closest thing it can do, and put the remainder in the cloud pass.
5. **Disagreements:** if building shows the design is wrong or inconsistent, fix the design in the same commit and
   record it in `design/decisions/`.
6. Stop everything you start. No dev server, Miniflare, Anvil, Verdaccio or port is left running at the end of a
   step.

## Evidence, after every step (Aaron, 16 November 2026)

Aaron is often on his phone, so each step and stage ends with evidence he can see there, not a claim that it works.

- **Captured, never retyped.** Every command output in the evidence is captured by a script (`tools/evidence/`) as it
  runs, with the command, its exit code, the time it took, and the commit it ran on. Planted failures are shown
  failing.
- **One evidence page per goal** (https://claude.ai/artifact/ChdX1m7bdTxTS1FGF2EZxB), built by
  `python3 tools/evidence/page.py` into `design/evidence/index.html` and republished to that same URL, as a private Artifact and updated after each step, newest first. Each
  step's entry has what it proves (the "done when" check, word for word), the captured sessions, the CI run link and
  the commit link. When a step makes something you can look at (a span tree, an eval table, generated files, the
  portal), the entry shows it.
- **The raw captures are committed** under `design/evidence/<step>/` (each with a `step.json` holding what it proves, plus `ci.json`), captured with `tools/evidence/capture.sh`, so the page can always be rebuilt from the
  repository.
- After each step, send Aaron the page's link with a one-line spoken summary.

## Reporting

After each stage lands, write Aaron a short report for the ear: what works now, what was decided, and what's next.
Don't ask him anything unless you're blocked.
