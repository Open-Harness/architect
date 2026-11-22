# Deployment: from a commit to a running system

Part of the frame ([`README.md`](README.md)). Proposed where marked; most of the pipeline already runs locally on
`layer/3` (L2.04 to L2.10), and the cloud pass swaps each local destination for the real one without new code.

## The principle

A revision is built once. Every artifact it ships, in every environment, is that one build, moved, never rebuilt. An
environment accepts a revision only with the verdicts that earn it. Where each projection goes is declared in the
environment's file, and the infrastructure it needs is derived from the model.

## The path of one change

```text
 commit ─▶ build ─▶ test (a fresh world per pull request) ─▶ main ─▶ CI writes verdicts (signed) ─▶ logbook
                                                                                                   │
                         ┌─────────────────────────────────────────────────────────────────────────┘
                         ▼
   promote --to staging      the exact bundle; refused without every operation green in test
                             proved again where it runs; releases the SDK and CLI under `next`
                         ▼
   promote --to production   the exact bundle; refused without every operation green in staging
                             records the release at the model's version; releases under `latest`
                         ▼
   watch --env production    the same evals on what the live system records; drift becomes a task
```

| Stage | What happens | Today (`origin/layer/3`) |
|---|---|---|
| build | one bundle per revision, with its sha256; the server answers `GET /_ortho/bundle` with both | built (D3 #21) |
| test | `test.ts` declares `lifetime: "2 hours"`: a world per pull request, made and destroyed as one unit | built locally |
| verdicts | only CI writes them, signed with its OIDC token, into the logbook (a Durable Object, R2 for models) | built, with a local OIDC issuer standing in for GitHub's (D3 #8) |
| promote | the exact bundle; refuses a dirty tree, an altered bundle, a revision without the verdicts it needs, naming what's missing | built (L2.05, `cli/src/main.ts:100`) |
| version | worked out by comparing this model with the last release's: a new operation is minor, a changed payload major, a budget a patch | built (L2.04) |
| release | `@acme/sdk` and `@acme/cli` to npm, the CLI as a single binary with a Homebrew formula | built against Verdaccio and a local tap (L2.06) |
| watch | the evals over a window of live traces, read through `TraceSource` | built (L2.09) |

## What each projection does at deploy time

Every mounted projection says which of three things it does (`ships`, [`projections.md`](projections.md)); the
environment says where.

| Projection | Ships | Where, in production |
|---|---|---|
| server | deployed | one Worker at `api.acme.dev`, with its Durable Objects, D1 database and R2 bucket; its doors: the API, `/mcp`, each adapter's inbound endpoint, the portal at `/portal` |
| sdk, react | released | npm, `latest` (staging: `next`) |
| cli | released | npm, a Homebrew tap, a binary per platform on GitHub releases |
| mcp | deployed, as a door of the server | `api.acme.dev/mcp`, or its own domain routed to the same Worker (question 2 below) |
| docs, portal | kept, and served by the server | the portal is a route of each environment's own Worker (F1 "built since") |
| solidity | deployed | each contract on the environment's chain, verified; redeployed only when its bytecode hash changes (L4.08) |
| keeper | deployed | inside the server Worker: a Durable Object alarm per time move (layer 5) |
| infra | kept | an Alchemy stack per environment, generated from the model and the mounts into `generated/infra`; staging runs it with `ortho env up\|destroy staging --run <id>` (M7.03, M7.04), the other environments by `promote` in the cloud pass |
| builder | kept | never deployed ([`builder.md`](builder.md)) |

One Worker per environment carries everything that runs on our side: the app's handlers, every feature's server
operations, every adapter's calls and doors, the MCP catalogue, the portal. One bundle, one set of secrets, one
place roles are checked.

## The environment file

```ts
// blueprint/environments/production.ts (proposed: places by mount, secrets and settings by source)
import { Blueprint, Cloudflare, GitHub, Homebrew, Npm, Secrets, Telemetry, Via } from "orthograph";
import staging from "./staging.ts";
import server from "../projections/server.ts";
import sdk from "../projections/sdk.ts";
import cli from "../projections/cli.ts";
import wallets from "../features/wallets.ts";

export default Blueprint.environment({
  promotesFrom: staging,                                     // by import, not a name
  issues: [Via.session, Via.key, Via.device, Via.agent],
  places: [
    server.at(Cloudflare.worker({ domain: "api.acme.dev", database: Cloudflare.d1() })),
    sdk.release(Npm.latest),
    cli.release(Npm.latest, Homebrew.tap("acme/tap"), GitHub.releases),
  ],
  secrets: Secrets.from(Cloudflare.secrets),
  settings: [wallets.settings.chains.is([1, 8453])],
  telemetry: [Telemetry.sink.axiom({ dataset: "acme-real" })],
});
```

What the file does not say, because the model already knows: which tables, actors and buckets exist (from every
mounted feature's things and `lives`), which secrets exist (from every mount's `secrets.ts`), which doors the server
opens (from every mounted projection and adapter).

## What plugins add at deploy time

- **Features** add tables and actors to the one database and Worker. Their migrations are generated with the app's,
  in one ordered list per environment; a feature's upgrade that changes a table is a major change to the app.
- **Adapters** add secrets that must be set before `promote` will go (`ortho secrets`), and doors. Most outside
  systems also have to be told where the door is: Stripe needs the webhook URL registered, a chain needs nothing.
  An adapter may declare a `provision` step that does it with a release secret (Stripe's restricted key, in CI), or,
  without one, `promote` prints the one line a person must do and refuses until it's confirmed.
- **Projections** add their artifacts to the release.

## Rollback and destroy

- **Rollback** is `promote` of an earlier revision: its bundle is kept, its verdicts are still in the logbook, and the
  version goes back with it. A migration that can't run backwards blocks a rollback across it, named by `promote`.
- **Destroy**: a world expires by its own alarm; `ortho env down <name>` stops a long-lived local environment; in
  the cloud, `ortho env destroy <name> --run <id>` has Alchemy destroy its stack and then deletes whatever the run's prefix still owns. Nothing is left running (AGENTS.md).

## The day, in commands

```text
$ git push                                    # CI: build, a test world, check, prove, verdicts
$ ortho impact
changes since 1.3.0   + wallet.link (wallets 1.2.0)   ~ allowance.spend budget
next 1.4.0            stale allowance.spend in staging, production
$ ortho promote --to staging
bundle 7f3e…c21 (rev a91c2e0)   test ✔ 31/31 operations
secrets ✔   stripe door registered ✔
proving in staging … 31/31 ✔   released @acme/sdk@1.4.0-next.1, @acme/cli@1.4.0-next.1
$ ortho promote --to production
bundle 7f3e…c21   staging ✔ 31/31
released 1.4.0: @acme/sdk, @acme/cli, brew acme/tap/acme
$ ortho watch --env production
allowance.spend  p95 88ms / 150ms   refused 3% (AllowanceExceeded)   ✔
```

## Today vs proposed

| | Today | Proposed |
|---|---|---|
| Where outputs go | fixed keys: `deploy: { server, mcp, portal }`, `publish: { sdk, cli }` (`examples/acme/blueprint/environments/production.ts`) | `places`, each a mounted projection by import |
| MCP | served at `/mcp` by the server (L2.08), yet production also declares `mcp: Deploy.worker({ domain: "mcp.acme.dev" })` | a door of the one Worker (question 2) |
| Infrastructure | per-environment wrangler configs under `.ortho/environments/` (D3 #17) for the local environments; the Alchemy stack in `generated/infra` for staging (D3 #5, M7-03) | an Alchemy stack generated from the model and mounts |
| Adapter provisioning | none | a declared `provision` step, or a refused `promote` naming the manual line |
| Cloud | none: every environment is a local process with its own state (G1) | the cloud pass: a config change per destination, with Aaron's yes on each credential |
