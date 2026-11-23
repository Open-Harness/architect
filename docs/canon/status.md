# Where Orthograph stands: what is built, what is left, and the packages

This is the canon's status page. It merges three older pages, retired by
[K41](../../design/decisions/K41-canon-map.md) (Aaron, 23 November 2026: "yes to the canon map"): the scope map
(`design/scope.md`), the package map (`design/packages.md`) and the framework map from the model draft
(`design/model/README.md`, sections 4 and 5). Each is kept word for word as a dated record in
[`design/history/retired-2026-11-23/`](../../design/history/retired-2026-11-23/scope.md).

**How it was read.** The capability map was read from the code on `goal/stage-1` (at `f7d28a42`) and `goal/on-chain` on
21 November 2026, by four read-only passes the conductor ran. The rows K41 settled were read again at `goal/stage-1`
`ea343643` on 23 November 2026: the request key, prove failing fast, the monitor, the graphs and staging. Status is
judged by the code and the checks, never by the ticks in [`milestones.md`](../../design/milestones.md), which lag.
Where a tick and a check disagree, the check wins (K41, clash 7).

Status words: **Built** (in `packages/`, with a check that passes), **Partial** (built, with a named piece missing),
**Spiked** (only throwaway code in `spikes/` proves it), **None** (nothing yet). Since 23 November 2026, what is built
is on `main`: `goal/stage-1` landed there (#707) and is retired.

## 1. The releases (K28)

| Release | A person outside can… | Done when | Left to build |
|---|---|---|---|
| **Preview** (`next` on npm) | install Orthograph, write a blueprint, get the server, SDK, CLI, MCP, docs and portal, and prove journeys on their own machine | Gate M1 passes on `main`, and the `@orthograph/*` packages, `orthograph` and the preset are on npm under `next` | milestone 1's last piece, the machine graphs (M1.50, check 40 still red); the npm publish under `next` itself, which Aaron runs (M1.51's dry run passes, #683) |
| **Beta** (the framework the superagent proves, K42) | build an always-on agent app on Orthograph from npm: things with versions, events in and the outbox, agents that live for weeks, secrets and lent tokens, signed webhook doors, the pages on UI SDK | every framework piece the superagent pulled, extracted into Orthograph's packages and published, with the superagent running on that published framework | the superagent's slices 6 to 14 and what they pull; its launch is its own milestone, not the beta's |
| **1.0** (Capxul core, K42) | build a business app on Orthograph from npm: everything Capxul core needed for its books, HR, payroll, identity checks and bank accounts through Bridge | every framework piece Capxul core pulled, extracted into Orthograph's packages and published, with Capxul core running on it in its staging, plus M7.01 to M7.04, M7.06 and M7.13 | what Capxul core pulls (K43), and the real release |

Since K42 (23 November 2026), the releases are the framework's: the beta is what the superagent proves and 1.0 what Capxul core proves (K43). The stage headings below (stages 2 to 4) are
Plugged In's, no longer 1.0's; Goal 18's slice 2 rewrites this map as the board's items, each with its stage.

**Where Goal 4 falls.** Goal 4 (on chain, end to end) served 1.0 until K42, not the preview or the beta: its slices 2 and 9 to
11 are stage 2 work, and slices 1, 3 to 8 and 12 are stage 3. Only slice 1 (the language and host seam) touches the
core everything else uses.

## 2. The capability map

### The core: blueprint, compiler, outputs, proof (preview)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Things, fields, machines, operations, steps | Built | `packages/orthograph/src/modules/{things,machines,operations}` | M1.03, M1.26 |
| Values | Partial | a value's pattern never reaches the model (open problem S-28) | M1.42 |
| Errors with one refusals table | Built | `examples/plugged-in/generated/api/src/errors.ts` | M1.47 |
| Events the compiler checks are fillable | Built | `packages/compiler/src/modules/model/internal/fillable.ts` | M1.48 |
| Invariants (unique rules), enforced and explained | Built | checks 31, 32, 34, 35; the portal's Rules section | ST1.09 to ST1.22 |
| Visibility: public, private, secret, issued | Built | `packages/language-effect/src/modules/visibility` | M1.35 |
| Stores (database, actor) | Built | `packages/host-cloudflare/src/modules/{store,actors}` | M1.17 |
| Generated server, SDK, CLI, docs | Built | checks 14 and 20; `generators/.../docs.ts` | M1.11 to M1.13 |
| Generated MCP | Partial | tool calls carry no request key (open problem S-16) | M1.12, M1.37 |
| Request key in traces | Built | check 38: `request.key` on every attempt's span of a keyed call, and the calls table filters by it (K41, clash 5) | M1.12a |
| Self-explaining scaffold and journey stubs | Built | `projections/.../handlers` | M1.44, M1.45 |
| Plugins, mounts, adapters as steps, projections as plugins | Built | checks 01 to 08 | M1.05 to M1.14 |
| `ortho prove`: nine evals, `--changed`, warm world | Built | checks 29, 30 | M1.16, ST1.23, ST1.24 |
| Prove fails fast on a broken source | Built | checks 33 and 36 green | S-29 |
| Climb check and the grid | Built | CI `e2e-climb`, `e2e-grid` | Goal 3 |
| Logbook, promote, publish to the local registry, watch | Built | layer 2 checks | L2 |
| Telemetry carrying the model | Built | checks 13, 17 | M1.18 to M1.21, M1.36 |
| Portal viewer: things, operations, lifecycle, rules, traces, journeys | Partial | calls and metrics, the role a caller held, step verdicts | M1.13 |
| Portal monitor, derived from the model | Built | check 39 | M1.49 |
| Machine graphs | None | check 40 red | M1.50 |
| A Node host | None | the server runs only as a Cloudflare Worker; no slice | none (Goal 4 slice 1 names `Host.node`) |
| npm preview of the framework | None | publish goes only to Verdaccio | M1.51 |

### Stage 1: workable (Plugged In's first stage)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Plugged In's seven journeys | Built | 56 of 56 steps green; a required CI check on stage 1 | ST1.02 |
| Principals beyond a person (agent, service, system, `Via`) | None | `roles/types.ts` has `anonymous` and `person` only | M2.01, M2.03 |
| Roles declared with `who` and `holds` | None | only `rule` | M2.17, M2.18 |
| Auth as a plugin | Partial | Better Auth runs in `host-cloudflare`; its things are copied into each app | M2.05, M2.06 |
| Organizations as a plugin | Partial | copied things in `examples/starter` | M2.07, M2.11 |
| Secrets by declaration | Partial | per environment only; no plugin secrets, no `ortho secrets set` | M2.04 |
| `ortho new` and `ortho new feature` | None | `packages/preset` is still the Nx preset | M2.09, M2.10 |
| `ortho add` for events, errors, roles, moves | Partial | thing, operation, read, journey only | M2.14, M2.15 |
| Adopt a mounted thing | None | | M2.19, M2.20 |
| Journeys through the CLI, MCP and the page | None | no `--through` | M2.08, ST1.25 |
| The handles plugin | None | the code runs inside Plugged In; not extracted | ST1.03 |
| The pieces on UI SDK (K29) | None | no `generated/web/` yet; `@orthograph/web` is the runtime | ST1.25, ST1.06 |
| Plugged In's three screens | None | no `src/web/` | ST1.04 |
| The infra projection and `ortho env up` / `destroy` staging | Built | checks 37 and 41, run here with no credential and no network (K41, clash 6) | M7.03, M7.04 |
| A live staging run: deploy, run the story, destroy | Partial | the staging workflow (`.github/workflows/staging.yml`) runs it; five clean runs in `spikes/staging-pass` before it | M7.01, M7.04 |

### App UI (built as an app needs it)

The UI is pieces, not hooks (K29, K41 clash 2): one UI SDK piece per operation, in place of the React hooks ST1.01
once planned.

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| UI SDK as the interface base | Decided | K24 | K24 |
| A generated piece per operation on UI SDK | Spiked | `spikes/ui-sdk-real-world`; no generator yet | ST1.25 (K29) |
| Agent marks from blueprint meaning | Spiked | three of four map; approval and a hidden payload field can't be declared | none |
| Actions: one per operation, for the page, MCP and the CLI | Spiked | `spikes/agent-native-compat`, `ui-sdk-real-world/src/action.ts` | M1.22, M1.23 (moved into stage 1 by K29) |
| Approvals asked once | Spiked | agent-native checks 04 to 06 | M1.23, M1.37 |
| Portal chat and "Needs you" | Partial | `portal-ui` has the chat parts; nothing uses them | M1.24 |
| One package behind the portal's components (HeroUI Pro today, phased out by K24) | Built | `packages/portal-ui`, check 15 | M1.34 |
| The new portal, on UI SDK with a declared map | None | Goal 6 builds `packages/portal-next`; one cutover then retires the old client (K29, K31, K41 clash 8) | Goal 6, then ST1.28 and ST1.27 |

### On chain and wallets (1.0, stages 2 and 3)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Wallet keys, signing, simulated sends, keystore | Built | `packages/wallets` | M1.27 to M1.32 |
| EVM adapter and Anvil per world | Built | `packages/chain-evm` | M1.30, M1.31 |
| Confirmation depth per environment | Built | check 18 | M1.38 |
| Browser wallet signer | Partial | only against a stub; never in Chromium | M1.29, ST2.03 |
| Relayer, follower | Partial | library pieces only; no actors | M6.07, M6.09 |
| Link a wallet with SIWE | Spiked | 26 checks in a spike; in no goal | M2.13 |
| Pay by handle | None | | ST2.04 to ST2.06 |
| Webhooks and `on:` events | None | no decision, nothing scheduled | M5.01, M5.03 |
| Language and host plugin kinds | None | design only | K27, Goal 4 slice 1 |
| Chain store, Solidity output, Foundry tests and fuzz | Spiked | `language-solidity` is empty; shape proved in `spikes/chain-languages` | M6.10 to M6.13 |
| Contract client and signing | Spiked | | M6.01, M6.14, M6.15 |
| Safe, Hats and the budgets module | None | no spike yet | ST3.01 to ST3.08, M6.16 |

### Workflows, agents, time (1.0, stage 3)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Declared workflows | None | no decision, no spike | M3.01 to M3.03 |
| A durable agent run | Spiked | `spikes/durable-run` | M4.01, M4.03, M4.04, M4.09 |
| Model adapters and a stand-in model | None | | M4.05, M4.06 |
| Tools from operations; the Run thing | None | | M4.07, M4.10 |
| An agent writes a handler from a brief | Built | `ortho brief`, layer 1 check 04 | Gate 1 |
| No wall clock; `Timers`; counted work | Partial | in-memory timers and the lint rule; no world timer table | M8.06, M8.07 |
| World clock, moves made by time, the keeper | Spiked | `design/spikes/world-clock.md`; the rest is M8's | M8 |

### Stage 4 and the release (1.0)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Private club on Aztec | Spiked | `spikes/noir-private-core`; `spikes/aztec-club` doesn't exist | ST4.01 to ST4.08 |
| Real npm, Homebrew, GitHub releases | Partial | local tap and binary only | M7.02, M7.06, M7.13 |
| CI-signed verdicts | Spiked | `spikes/ci-oidc` | M7.05 |

### Off v1.0's path

The factory and the work board (M3.04 to M3.21), the bench and the builder's tools (M4.11 to M4.14), workspaces and
the building agents (M4.17 to M4.25; M4.25 is Goal 17's since K39), Stripe, Resend, adapters from OpenAPI, outbox and
views (M5.04 to M5.13), and the real vendors, the builder's staging token and contracts on a testnet (M7.07 to M7.09); Capxul (M7.10, M7.11) proves 1.0 (K42, K43). Most are None; the work board and E2B workspaces are
Spiked.

## 3. Holes no slice owns

1. No Node host.
2. Proving against a deployed address on a schedule has no slice beyond the staging workflow.
3. The blueprint can't declare an approval or a hidden payload field, which generated pieces need.
4. Stage 2 needs webhooks (M5.01, M5.03) and SIWE linking (M2.13); neither is in any goal.
5. Stage 3's signature collection and the keeper rest on workflows, which have no decision or spike.
6. The journey language's open problems: one world per journey, comparing one answer with the last, and sending
   malformed payloads.
7. Stage 3's Safe and Hats spike and stage 4's Aztec club spike don't exist, though both stages start from them.

## 4. The framework map

### The core: the smallest Orthograph that is useful alone

The core is everything needed to go from a blueprint to a proved app on one host, in one language, on this machine
(K30, section 1): the `Blueprint` API, the compiler, the generators, the Effect language, the Cloudflare host, prove
with its evals and the ledger, the logbook, the `ortho` command and its lint rules, and three projections: the model,
the API and the server. Every other projection, the docs and the portal included, is standard library: you mount it
(K30). Three edges cross that line today: the generators import the portal, prove imports the EVM chain port for
wallet worlds, and the command depends on the whole projections package. No check yet proves an app with only the
core.

### The five plugin kinds (K27)

| Kind | What it adds | Plugins today | Built in today |
|---|---|---|---|
| **feature** | what else the system is: things, operations, handlers, journeys | `@orthograph/wallets` | auth (in the host and the starter) |
| **adapter** | what is outside it: calls out, events in, a stand-in | none; test fixtures only | none |
| **projection** | how people reach it | model, API, server, SDK, CLI, MCP | docs and the portal |
| **language** | what behaviour is written in | none as a plugin | `@orthograph/language-effect` |
| **host** | where it runs, how it is reached and deployed | none as a plugin | `@orthograph/host-cloudflare` |

### The standard library: what Orthograph ships for apps to mount

| Plugin | What it is | Status |
|---|---|---|
| `@orthograph/auth` | people, sessions, API keys, the device flow, OAuth for MCP | designed (M2.05, M2.06); built today inside the host and the starter |
| `@orthograph/organizations` | organisations, memberships, invitations, `holds` | designed (M2.07); built today as starter copies |
| `@orthograph/handles` | a public name one person holds | designed (ST1.03); built today as Plugged In's own thing |
| `@orthograph/wallets` | keys on a device or a server: make, import, sign, send | built |
| `@orthograph/web` and the pieces | one UI SDK piece per operation, and the runtime they share (K29) | designed (ST1.25) |
| docs and the portal | the readers' projections; the new portal is built on UI SDK (K24, K31) | built in, to become standard projections (K30) |
| the Safe, budgets and hats plugins | a multisig vault with budgets, for stage 3 | designed |
| `@orthograph/stripe`, `@orthograph/resend` | payments and email adapters | designed (M5) |
| `@orthograph/agents`, `@orthograph/work` | durable agents; the factory | designed (M3, M4) |

Goal 17 (K39) adds four features, `@orthograph/superagent`, `@orthograph/intake`, `@orthograph/tickets` and
`@orthograph/prompts`, written first inside `examples/superagent/plugins/` and moved into `packages/` once they work; the
`@orthograph/sandbox` adapter (K40); and the `@orthograph/github` (M4.25), `@orthograph/slack` and `@orthograph/posthog`
adapters, generated from each service's spec (M5.07), with `@orthograph/webhook` for a service with none. Nothing is
published to npm before the preview; every milestone before it publishes to the local Verdaccio.

### Capxul's own pieces

Capxul is not built on Orthograph yet; since K43 (23 November 2026) it is rebuilt in this repository on
`goal/capxul`, in ERPNext's shapes, and it proves 1.0. What follows is the earlier plan K43 replaces. It has its own blueprint package and generator, with the same ideas by hand, so
moving it onto Orthograph means declaring it again. Hats, budgets and the Safe adapter become standard library, because
Plugged In's stage 3 needs them too. What stays Capxul's is what only it needs: approvals as its directors run them,
payments into ERPNext, and the Frappe bench (a source through an adapter, K3). Two repositories (K30, section 2):
Orthograph (the core and the standard library) and Capxul (the app and its own plugins).

## 5. The packages

The map and why it is shaped this way: [`decisions/M0-packages.md`](../../design/decisions/M0-packages.md). The layer 1
and 2 version is in [`history/packages-layers-1-2.md`](../../design/history/packages-layers-1-2.md).

Every package below is in `packages/` today except the three marked designed.

```text
packages/
  orthograph/        orthograph                    the front door: the Blueprint API (thing, machine, event, error,
                                                   role, operation, read, journey, world, environment, value, todo;
                                                   a plugin's descriptor: feature, adapter, projection, choice, need,
                                                   call, setting; and the mount, use), with Via, Host, Door, Ships
                                                   and Stand. What projects and their generated code import. Effect only.
  compiler/          @orthograph/compiler          reads blueprint/ by path and builds the model: every declaration, its
                                                   hash, what it uses; compares two models; finds blanks
  generators/        @orthograph/generators        the Nx plugin: scaffolds write once; sync generators render each
                                                   output and fail `nx sync:check` on drift
  projections/       @orthograph/projections       the projections an app mounts in blueprint/projections/. Build time only
  language-effect/   @orthograph/language-effect   the Effect language, and the runtime generated code runs on
  language-solidity/ @orthograph/language-solidity the Solidity language (a placeholder until M6)
  host-cloudflare/   @orthograph/host-cloudflare   where it runs: Workers, Durable Objects, alarms, D1, R2, and auth on
                                                   Better Auth until M2 moves it into @orthograph/auth
  prove/             @orthograph/prove             worlds, journeys, evidence from telemetry, evals, verdicts, promote,
                                                   publish, releases
  lint/              @orthograph/lint              oxlint rules for what types can't see, and against the old names
  cli/               @orthograph/cli               the `ortho` command
  preset/            @orthograph/preset            the Nx preset that makes a starter project (until `ortho new`, M2.09)
  portal/            @orthograph/portal            the portal every project gets
  portal-ui/         @orthograph/portal-ui         the portal's components under our names (F7, M1.34); deleted at cutover (K31, Goal 6)
  shell/             @orthograph/shell             designed: the app's map at run time: router, layouts, navigation, palette (K31)
  theme/             @orthograph/theme             the one stylesheet on UI SDK's `--ui-*` tokens (K29, K31)
  portal-next/       @orthograph/portal-next       designed: the new portal client on the shell and the map, until cutover (Goal 6)
  web/               @orthograph/web               designed: the browser host and the runtime every generated piece shares (K29, ST1.25)
  wallets/           @orthograph/wallets           the first feature plugin (M1.29)
  chain-evm/         @orthograph/chain-evm         the EVM chain port wallets is built on
  logbook/           @orthograph/logbook           verdicts and the model, kept per project
  services/          @orthograph/services          private: the stand-ins tests and gates start as processes; never published
examples/
  plugged-in/        the canon's one example (K9)
  acme/              the fixture the tests and gates run on
  work/              the work app (F5)
  starter/           what the preset copies into a new project
  signup/            retired as a teaching example (K37, K41); deleted by ST1.08's checks slice
e2e/                 the gates
```

**Rules, held by Nx module boundaries.**

- `orthograph` (tag `scope:orthograph`) depends on nothing but Effect. Every other package may import it.
- A project (`scope:project`) depends only on `scope:orthograph`, `scope:language`, `scope:host` and
  `scope:projections`: a blueprint mounts a projection as it mounts any plugin, and nothing it generates imports the
  package.
- `env:runtime` packages depend only on `env:runtime` packages; `env:build` packages may use both.
- Today `portal-ui` is the only package that imports `@heroui-pro/*` (lint, F7); new screens build on UI SDK and HeroUI
  is phased out (K24), after which the lint rule goes with it.
- `language-effect`'s runtime is the only package generated code imports at run time, besides `orthograph`, the host
  and the project's own code.
- `compiler` and `generators` never run in production.
- A language is a package of its own (`language-effect`, `language-solidity`, later `language-noir` and
  `language-python`); a host is where it runs (`host-cloudflare`).

**A project made with it.**

```text
plugged-in/
  blueprint/
    values/                 named types, each saying what it is in every language
    things/<thing>/         thing.ts, machine.ts, events.ts, errors.ts, roles.ts, invariants.ts, verbs/<verb>.ts
    starting-worlds/<name>.ts
    environments/<name>.ts  clock, secrets, destinations
    stores/<name>.ts        a place things live besides the default (K3)
    features/  adapters/  projections/   the mounts, one file each
  journeys/<journey>.ts
  src/
    <thing>/<verb>.ts       a thing's handlers, mirroring blueprint/things/<thing>/
  generated/
    model/  api/  server/  sdk/  cli/  mcp/  docs/  portal/  infra/
```

## 6. Rough edges that block the loops

- **Starting an app.** Orthograph is not on public npm, so a new app needs a local registry and a publish first (the
  preview fixes this, M1.51). Every local publish is version 0.0.0, so caches must be kept per run. The preset's
  starter folder is filled only by a test. Creating an app needs `--trustThirdPartyPreset`, or Nx stops to ask.
- **Writing journeys** (`design/goals/03-snags.md`): a starting world serves one journey and gives back only the last
  answer; a step can't compare with the answer before it; no journey can send a malformed payload; and a handler or
  journey can name a machine state only as a string.
- **Proving every client.** Journeys call the server over plain HTTP, so the SDK, the CLI and MCP are never proved by a
  journey. Proving through each client is M2.08.
- **CI and staleness.** Orthograph knows, per operation, what a change makes stale, but CI never reads it: the ledger
  lives in `.ortho/`, which is git-ignored, so every CI prove starts from nothing. K30, section 5 settles how the two
  should meet.

## 7. Where the docs still disagree

1. Noir is under "Later" and in K5 as later, but is v1.0's stage 4.
2. The release list: K9 says M7.01 to M7.04 and M7.06; `milestones.md` adds M7.13.
3. The npm preview is promised after Gate M1, but M7 says npm waits on stage 4.
4. Staging: after Gate M2 in the milestones, inside stage 1 in Goal 3.
5. `milestones.md` still says "Everything runs locally: no cloud"; the ledger's summary counts are stale.
