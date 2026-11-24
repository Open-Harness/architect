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

Stage words (K42, section 2; K41's Built, Partial, Spiked and None became these, see section 2): **provisional**,
**spiked**, **scaffoldable**, **building**, **built** and **extracted**. Since 23 November 2026, what is built is on
`main`: `goal/stage-1` landed there (#707) and is retired.

## 1. The releases (K28)

| Release | A person outside can… | Done when | Left to build |
|---|---|---|---|
| **Preview** (`next` on npm) | install Orthograph, write a blueprint, get the server, SDK, CLI, MCP, docs and portal, and prove journeys on their own machine | Gate M1 passes on `main`, and the `@orthograph/*` packages, `orthograph` and the preset are on npm under `next` | milestone 1's last piece, the machine graphs (M1.50, check 40 still red); the npm publish under `next` itself, which Aaron runs (M1.51's dry run passes, #683) |
| **Beta** (the framework the superagent proves, K42) | build an always-on agent app on Orthograph from npm: things with versions, events in and the outbox, agents that live for weeks, secrets and lent tokens, signed webhook doors, the pages on UI SDK | every framework piece the superagent pulled, extracted into Orthograph's packages and published, with the superagent running on that published framework | the superagent's slices 6 to 14 and what they pull; its launch is its own milestone, not the beta's |
| **1.0** (Capxul core, K42) | build a business app on Orthograph from npm: everything Capxul core needed for its books, HR, payroll, identity checks and bank accounts through Bridge | every framework piece Capxul core pulled, extracted into Orthograph's packages and published, with Capxul core running on it in its staging, plus M7.01 to M7.04, M7.06 and M7.13 | what Capxul core pulls (K43), and the real release |

Since K42 (23 November 2026), the releases are the framework's: the beta is what the superagent proves and 1.0 what Capxul core proves (K43). The group headings in section 2 are
Plugged In's, no longer 1.0's; section 2 is the board's items, each with its stage.

**Where Goal 4 falls.** Goal 4 (on chain, end to end) served 1.0 until K42, not the preview or the beta: its slices 2 and 9 to
11 are stage 2 work, and slices 1, 3 to 8 and 12 are stage 3. Only slice 1 (the language and host seam) touches the
core everything else uses.

## 2. The capability map

The board's truth (K42, section 5). One row is one item: a piece of work with a stage, an app that pulled it and a
release. `tools/github/sync.mjs --board` reads the rows and writes one issue per row and the Project's fields, so a goal
changes a row in the same pull request that changes the item. Each id is stable: never reuse one, and rename an item by
changing its words, not its id.

| Column | What it holds |
|---|---|
| id | a short stable name, lowercase words joined by hyphens; a `gap-` start marks a hole no slice owned (kind: gap), any other id is a capability |
| Item | `Name: what it is and what is missing`: every Item starts with a short name (at most 50 characters) and a colon, and the name is the issue's title |
| Stage | K42, section 2: **provisional** (an app listed it, or it is only designed), **spiked** (only throwaway code in `spikes/` proves it), **scaffoldable** (declared through the framework, journeys red), **building** (partly built, or its checks are red), **built** (green on `main` and proved by the journeys of the app that pulled it; a piece built before an app proves it stays building), **extracted** (moved out of an app's `plugins/` into `packages/`) |
| Pulled by | the app that needs it first: **superagent**, **Capxul**, or **framework** (no app pulled it: the engine's own, or nobody has asked) |
| Release | **preview**, **beta** or **1.0**, the framework release it ships in (K42, section 6); `—` for a piece no app has pulled that is not in the preview. A piece the superagent pulls for its slices 1 to 14 is beta; the superagent's launch alone, or Capxul alone, is 1.0 |
| Milestone | the first app milestone that pulls it, or `—` for "Not yet needed". The superagent's: `coding agent`, `triage agent`, `extraction`, `launch`. Capxul's: `getting paid`, `books`, `people and payroll`, `banking` |
| Lane | `goal-<n>` when a running goal has claimed it (K42, section 3: the claim is this lane plus the row's Touches, and the `lane:goal-<n>` label on its issue), else `none`. A goal is building an item when it sets its lane |
| Touches | the paths its work changes, which a claim names |
| Needs | the ids that must land first |
| Evidence | pull requests and paths, the checks that prove it, the slices it came from (M, ST, S and K numbers), and what is still open. It can also **adopt** an issue that already describes the item, see below |

**Adopting an issue.** Many open issues already describe items, and the sync must not make a second one. An Evidence
cell can hold, each in backticks, `` `issue #531` `` to adopt that issue and `` `folds #533, #538` `` for other issues that are the same
item. The sync then writes the row's marker, labels (its kind, release and lane, replacing `kind:ask`), milestone,
issue type and Project fields onto the adopted issue, and keeps the words it had under a line of its own, so nothing is lost. It
closes each folded issue as a duplicate with a comment pointing at the row's issue. A row adopts at most one issue, an issue
belongs to at most one row, and the sync stops before any write if an adopted or folded number is no issue, is a pull request or
is another row's, or is not a `kind:ask` issue. **Only `kind:ask` issues are adopted or folded.** A snag, a claim (a `kind:snag`
issue another goal waits on), a decision, a goal or a slice is never touched; name it as a plain `#N` in Evidence. A case-2 ask
(K42, section 3) stays an Ask until Goal 18 settles it.

**Status and dates.** The Project's Status follows the row: Done when it is built or extracted, Running (the Project's "in progress")
when it has a lane, Ready when everything in Needs is built, otherwise Blocked. Start is the day its lane first appeared on this
page or its first evidence pull request merged; End is the day it was built (the last evidence pull request's merge); a row not
yet done gets a forecast from `tools/github/roadmap.mjs` (dependency order and the pace of the last seven days), recomputed every run, and a
milestone's due date is the forecast end of its last item. A row no app has pulled has no dates.

The split (K42, section 3, Aaron's call 9): the superagent pulls versions, timers, safe repeats, events in and the
outbox, secrets, webhook doors, the pages, sign-in and the live deploy; Capxul pulls reports, lists, trees and dates.
Organisations are not shared: the superagent's teams and Capxul's companies are two rows (call 10). A piece the first
app builds is mounted by the other once it is extracted.

How the rows were read: K41's status words became K42's stages. **Built** here follows K42, section 2: green on `main`
and proved by the journeys of the app that pulled it. Plugged In is the example app (K9), and its journeys are app
journeys: `e2e/stage1` (its seven journeys) and the `e2e/m1` checks that run on it. A row is built when those prove it,
and its Evidence names the journey or suite. A piece that only its own package tests, `acme` or a fixture prove is
building, however green, until an app's journeys prove it. K41's **Partial** is building, **Spiked** is spiked, and
**None** is provisional (building where a check is already red). A decision with no code is provisional. Plugged In's
journeys do not stand in for the superagent's or Capxul's: a piece one of them pulls moves back to building if its
journeys find a hole.

### The core: blueprint, compiler, outputs, proof (preview)

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| things-machines-ops | Things and machines: things, fields, machines, operations, steps | built | framework | preview | — | none | `packages/orthograph/src/modules/things`, `packages/orthograph/src/modules/machines`, `packages/orthograph/src/modules/operations` | — | slices M1.03, M1.26; proved by Plugged In's journeys: `e2e/stage1/01-plugged-in-journeys.test.ts` |
| values | Values: a value's pattern never reaches the model | building | framework | preview | — | none | `packages/orthograph/src/modules/values` | — | slice M1.42; open problem S-28 |
| errors-refusals | Errors and refusals: errors with one refusals table | built | framework | preview | — | none | `packages/orthograph/src/modules/errors` | — | `examples/plugged-in/generated/api/src/errors.ts`; slice M1.47; proved by Plugged In's journeys: `e2e/stage1/01-plugged-in-journeys.test.ts` (a taken name is refused), and `e2e/m1/20-plugged-in-loop.test.ts` |
| events-fillable | Fillable events: events the compiler checks are fillable | building | framework | preview | — | none | `packages/compiler/src/modules/model/internal/fillable.ts` | — | slice M1.48; not yet proved by an app's journeys: the compiler's own check; no app journey exercises it |
| invariants | Invariants: unique rules, enforced and explained | built | framework | preview | — | none | `packages/orthograph/src/modules/invariants` | — | checks 31, 32, 34, 35; the portal's Rules section; slices ST1.09 to ST1.22; proved by Plugged In's journeys: `e2e/stage1/01-plugged-in-journeys.test.ts`, and `e2e/m1/34-st1-19-plugged-in-declares-its-rules.test.ts` |
| visibility | Visibility: public, private, secret, issued | built | framework | preview | — | none | `packages/language-effect/src/modules/visibility` | — | slice M1.35; proved on Plugged In by `e2e/m1/20-plugged-in-loop.test.ts` (the portal's data file) |
| stores | Stores: database and actor | built | framework | preview | — | none | `packages/host-cloudflare/src/modules/store`, `packages/host-cloudflare/src/modules/actors` | — | slice M1.17; proved by Plugged In's journeys: `e2e/stage1/01-plugged-in-journeys.test.ts` |
| generated-outputs | Generated outputs: generated server, SDK, CLI, docs | built | framework | preview | — | none | `packages/generators` | things-machines-ops | checks 14 and 20; `packages/generators/src/modules/docs`; slices M1.11 to M1.13; proved on Plugged In by `e2e/m1/20-plugged-in-loop.test.ts` (every output, through the SDK and the CLI) |
| generated-mcp | Generated MCP: tool calls carry no request key | building | framework | preview | — | none | `packages/projections` | generated-outputs | open problem S-16; slices M1.12, M1.37 |
| request-key | Request key in traces: `request.key` on every attempt's span of a keyed call, and the calls table filters by it | built | framework | preview | — | none | `packages/host-cloudflare/src/modules/telemetry` | — | check 38; K41 clash 5; slice M1.12a; proved on Plugged In by `e2e/m1/38-m1-12a-request-key.test.ts` |
| scaffold-stubs | Scaffold stubs: self-explaining scaffold and journey stubs | building | framework | preview | — | none | `packages/projections` | generated-outputs | the projections' handlers; slices M1.44, M1.45; not yet proved by an app's journeys: proved on `acme` only |
| plugins-mounts | Plugins and mounts: plugins, mounts, adapters as steps, projections as plugins | building | framework | preview | — | none | `packages/orthograph/src/modules/plugins`, `packages/compiler/src/modules/mounts` | — | checks 01 to 08; slices M1.05 to M1.14; not yet proved by an app's journeys: proved on `acme` and fixtures only |
| prove-evals | `ortho prove`: nine evals, `--changed`, warm world | built | framework | preview | — | none | `packages/prove` | — | checks 29, 30; slices M1.16, ST1.23, ST1.24; proved by Plugged In's journeys: `e2e/stage1/01-plugged-in-journeys.test.ts` |
| prove-fails-fast | Prove fails fast: prove fails fast on a broken source | built | framework | preview | — | none | `packages/prove` | prove-evals | checks 33 and 36 green; slice S-29; proved on Plugged In by `e2e/m1/36-s29-prove-names-a-missing-rule.test.ts` |
| climb-grid | Climb and grid: climb check and the grid | building | framework | preview | — | none | `e2e/` | prove-evals | CI `e2e-climb`, `e2e-grid`; Goal 3; not yet proved by an app's journeys: proved on `acme` only |
| logbook-publish | Logbook and publish: logbook, promote, publish to the local registry, watch | building | framework | preview | — | none | `packages/logbook`, `packages/prove` | — | layer 2 checks; slice L2; not yet proved by an app's journeys: proved on `acme` only (`e2e/layer2`) |
| telemetry-model | Model telemetry: telemetry carrying the model | building | framework | preview | — | none | `packages/orthograph/src/modules/telemetry` | — | checks 13, 17; slices M1.18 to M1.21, M1.36; not yet proved by an app's journeys: proved on `acme` and a fixture only |
| portal-viewer | Portal viewer: things, operations, lifecycle, rules, traces, journeys; calls and metrics, the role a caller held and step verdicts are missing | building | framework | preview | — | none | `packages/portal` | telemetry-model | slice M1.13 |
| portal-monitor | Portal monitor: derived from the model | built | framework | preview | — | none | `packages/portal` | portal-viewer | check 39; slice M1.49; proved on Plugged In by `e2e/m1/39-m1-49-monitor-derived.test.ts` |
| machine-graphs | Machine graphs: the portal draws each machine | building | framework | preview | — | none | `packages/portal` | portal-monitor | check 40 red; slice M1.50 |
| gap-node-host | A Node host: the server runs only as a Cloudflare Worker | provisional | framework | — | — | none | `packages/host-cloudflare` | — | no slice; Goal 4 slice 1 names `Host.node` |
| npm-preview | npm preview of the framework: publish goes only to Verdaccio, and the publish under `next` itself is Aaron's to run | building | framework | preview | — | none | `packages/preset`, `tools/release` | prove-evals | slice M1.51, whose dry run passes (#683); the hand-over is #542; `issue #542` |
| plugged-in-journeys | Plugged In's seven journeys: 56 of 56 steps green | built | framework | preview | — | none | `examples/plugged-in` | prove-evals | a required CI check on stage 1; slice ST1.02; proved by `e2e/stage1/01-plugged-in-journeys.test.ts` |

### Stage 1: workable (Plugged In's first stage)

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| principals | Principals: beyond a person (agent, service, system, `Via`); `roles/types.ts` has `anonymous` and `person` only | building | superagent | beta | coding agent | goal-17 | `packages/orthograph/src/modules/roles` | — | slices M2.01, M2.03; K40 (`Blueprint.role(T, { service })`, `Blueprint.system`, `Via.*`); `issue #531`, `folds #533`; built on `goal/superagent` (slice 5 forms, the agent caller in slice 9, #781) |
| roles-who-holds | Roles declared with `who` and `holds`: only `rule` exists | provisional | superagent | beta | coding agent | none | `packages/orthograph/src/modules/roles` | principals | slices M2.17, M2.18 |
| sign-in | Sign-in: the auth plugin (`@orthograph/auth`: people, sessions, API keys, the device flow, OAuth for MCP): Better Auth runs in the host and its things are copied into each app | building | superagent | 1.0 | launch | none | `packages/host-cloudflare/src/modules/auth`, `packages/auth` | principals | slices M2.05, M2.06 |
| teams | Teams: the superagent's organisations (who shares and owns an agent), as a plugin: the things are copied into the starter | building | superagent | 1.0 | launch | none | `examples/starter`, `packages/organizations` | sign-in, roles-who-holds | slices M2.07, M2.11; K42 call 10 |
| companies | Companies: Capxul's organisations, as a plugin, apart from the superagent's teams | building | Capxul | 1.0 | books | goal-16 | `examples/capxul`, `packages/organizations` | sign-in, roles-who-holds | slice M2.07; K42 call 10; #757 (Capxul's app and its Company, merged on `goal/capxul`), `company.create` built by #786 |
| secrets | Secrets by declaration: per environment only, no plugin secrets, no `ortho secrets set` | building | superagent | beta | coding agent | none | `packages/orthograph/src/modules/secrets`, `packages/host-cloudflare` | — | slice M2.04; #690 |
| ortho-new | `ortho new` and `ortho new feature`: `packages/preset` is still the Nx preset | provisional | framework | — | — | none | `packages/preset`, `packages/cli` | sign-in, teams | slices M2.09, M2.10; M2.09 scaffolds Plugged In with auth and handles mounted, and it waits for M2.07 (`teams`) and ST1.07 (`sign-in` mounted in Plugged In); M2.27 is its check half (G12 pair); the app scaffold is a subcommand of the same `ortho new` as Goal 17's `ortho new adapter` (Goal 18, 24 November 2026) |
| ortho-add | `ortho add` for events, errors, roles and moves: thing, operation, read and journey only today | building | superagent | beta | coding agent | none | `packages/cli`, `packages/generators` | — | slices M2.14, M2.15 |
| adopt-mounted-thing | Adopt a mounted thing: so a running app can switch a plugin on after the fact (Capxul's modules, K43) | provisional | Capxul | 1.0 | — | none | `packages/compiler/src/modules/mounts` | plugins-mounts | slices M2.19, M2.20; the CRM comes after payroll, so no milestone yet |
| journeys-through-clients | Journeys through the CLI, MCP and the page: no `--through` | provisional | framework | — | — | none | `packages/prove` | generated-outputs | slices M2.08, ST1.25 |
| handles-plugin | The handles plugin: the code runs inside Plugged In and is not extracted | provisional | framework | — | — | none | `examples/plugged-in` | — | slice ST1.03 |
| web-runtime | `@orthograph/web`: the browser host and the runtime every generated piece shares | provisional | superagent | beta | coding agent | none | `packages/web` | ui-sdk-base | slices ST1.25, ST1.06; K29 |
| plugged-in-screens | Plugged In's three screens: no `src/web/` yet | provisional | framework | — | — | none | `examples/plugged-in/src/web` | ui-pieces | slice ST1.04 |
| infra-staging | Infra and staging: the infra projection and `ortho env up` / `destroy` staging, run with no credential and no network | built | framework | 1.0 | — | none | `packages/projections`, `packages/host-cloudflare` | — | checks 37 and 41; K41 clash 6; slices M7.03, M7.04; proved on Plugged In by `e2e/m1/37-m7-03-staging-plan.test.ts` and `e2e/m1/41-m7-04-prove-staging.test.ts` |
| staging-run | A live staging run: deploy, run the story, destroy; five clean runs in `spikes/staging-pass` came before the workflow | building | framework | 1.0 | — | none | `.github/workflows/staging.yml` | infra-staging | slices M7.01, M7.04 |
| live-deploy | Live deploy: A live deploy with a public address for webhooks, the superagent's launch | provisional | superagent | 1.0 | launch | none | `.github/workflows/staging.yml`, `packages/host-cloudflare` | staging-run, webhook-doors | K42, section 6 |

### App UI (built as an app needs it)

The UI is pieces, not hooks (K29, K41 clash 2): one UI SDK piece per operation, in place of the React hooks ST1.01
once planned.

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| ui-sdk-base | UI SDK as the interface base: decided, nothing wired yet | provisional | superagent | beta | coding agent | none | `packages/theme` | — | K24 |
| ui-pieces | A generated piece per operation on UI SDK: no generator and no `generated/web/` yet | spiked | superagent | beta | coding agent | none | `packages/generators`, `generated/web/` | ui-sdk-base, web-runtime | `spikes/ui-sdk-real-world`; slice ST1.25 (K29); `issue #476` |
| agent-marks | Agent marks from blueprint meaning: three of four map | spiked | superagent | beta | coding agent | none | `packages/orthograph` | ui-pieces | the spike's marks |
| gap-approval-declaration | Approval declaration: the blueprint can't declare an approval or a hidden payload field, which generated pieces need | spiked | superagent | beta | coding agent | none | `packages/orthograph` | agent-marks | no slice; found by the agent-marks spike |
| actions | Actions: one per operation, for the page, MCP and the CLI | spiked | superagent | beta | coding agent | none | `packages/projections` | ui-pieces | `spikes/agent-native-compat`, `spikes/ui-sdk-real-world/src/action.ts`; slices M1.22, M1.23 (moved into stage 1 by K29) |
| approvals-once | Approvals once: an approval is asked once | spiked | superagent | beta | coding agent | none | `packages/projections` | actions, gap-approval-declaration | agent-native checks 04 to 06; slices M1.23, M1.37 |
| portal-chat | Portal chat and "Needs you": `portal-ui` has the chat parts and nothing uses them | building | framework | — | — | none | `packages/portal-ui`, `packages/portal` | approvals-once | slice M1.24 |
| portal-ui | Portal UI package: one package behind the portal's components (HeroUI Pro today, phased out by K24) | building | framework | preview | — | none | `packages/portal-ui` | — | check 15; slice M1.34; not yet proved by an app's journeys: its own seam check only; no app journey |
| portal-next | The new portal, on UI SDK with a declared map: one cutover then retires the old client | building | framework | — | — | none | `packages/portal-next`, `packages/shell`, `packages/theme` | ui-sdk-base | Goal 6; #584, #669, #692, #693 (a draft); slices ST1.28, ST1.27; K29, K31, K41 clash 8 |
| pages | The pages: `Blueprint.page`, `shows`, `offers`, on the shell and the map language | building | superagent | beta | coding agent | none | `packages/shell`, `packages/theme` | ui-pieces | Goal 6 slice 3; #584 landed the shell, the map language and the app projection; K31, K36; #476 |

### On chain and wallets

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| wallets-keys | Wallet keys: signing, simulated sends and a keystore (`@orthograph/wallets`) | building | Capxul | 1.0 | getting paid | none | `packages/wallets` | — | slices M1.27 to M1.32; not yet proved by an app's journeys: its own checks only; no app's journeys yet (Capxul pulls it) |
| chain-evm | EVM chain adapter: EVM adapter and Anvil per world | building | Capxul | 1.0 | getting paid | none | `packages/chain-evm` | — | slices M1.30, M1.31; not yet proved by an app's journeys: its own checks only; no app's journeys yet (Capxul pulls it) |
| confirmation-depth | Confirmation depth: confirmation depth per environment | building | Capxul | 1.0 | getting paid | none | `packages/chain-evm` | chain-evm | check 18; slice M1.38; not yet proved by an app's journeys: its own check only; no app's journeys yet (Capxul pulls it) |
| browser-wallet-signer | Browser wallet signer: only against a stub, never in Chromium | building | framework | — | — | none | `packages/wallets` | wallets-keys | slices M1.29, ST2.03 |
| relayer-follower | Relayer and follower: both actors are on `main`, and the relayer has reorg and ordering bugs | building | Capxul | 1.0 | getting paid | none | `packages/host-cloudflare/src/modules/follower`, `packages/host-cloudflare/src/modules/relayer`, `packages/chain-evm/src/modules/tx` | wallets-keys, chain-evm | #679 (`Follower`, on `main`); #677, the relayer, landed on `main` by #778; snag #784 blocks it, so it stays building until the fixes and an app's journeys prove it: a first receipt is treated as final so a reorg is missed, a fill is broadcast before it is stored so a restart may sign a second transaction at one nonce, and a resumed transaction drops its access list; #700 (fees are not bumped); slices M6.07, M6.09 |
| siwe-linking | Link a wallet with SIWE: 26 checks in a spike, in no goal | spiked | Capxul | 1.0 | — | none | `packages/wallets` | sign-in | slice M2.13; #486: Capxul's later sign-in with a Safe needs ERC-1271, after its first feature |
| pay-by-handle | Pay by handle: pay a person by their handle | provisional | framework | — | — | none | `examples/plugged-in` | handles-plugin, wallets-keys | slices ST2.04 to ST2.06 |
| plugin-kinds-language-host | Language and host plugin kinds: design only | provisional | framework | — | — | none | `packages/orthograph/src/modules/plugins` | plugins-mounts | K27; Goal 4 slice 1 |
| chain-solidity | Solidity: chain store, Solidity output, Foundry tests and fuzz; `language-solidity` is empty | spiked | framework | — | — | none | `packages/language-solidity` | plugin-kinds-language-host | `spikes/chain-languages`; slices M6.10 to M6.13 |
| contract-client | Contract client: contract client and signing | spiked | Capxul | 1.0 | getting paid | none | `packages/chain-evm` | chain-evm | slices M6.01, M6.14, M6.15; #475; #475 |
| safe-hats-budgets | Safe, Hats and budgets: Safe, Hats and the budgets module; the budgets design is decided when an app pulls budgets | spiked | Capxul | 1.0 | books | none | `packages/wallets` | contract-client | `spikes/safe-hats-module` (#294); `design/decisions/ST3-budgets.md`; slices ST3.01 to ST3.08, M6.16; `issue #484` |

### Workflows, agents, time

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| workflows | Declared workflows: no decision, no spike | provisional | framework | — | — | none | `packages/orthograph` | — | slices M3.01 to M3.03; #472, #462 (the decision, still to reach `main`); `issue #462` |
| durable-agent-run | Durable agent run: A durable agent run, on Pi Durable | building | superagent | beta | coding agent | goal-17 | `packages/host-cloudflare/src/modules/actors` | timers | `spikes/durable-run`; slices M4.01, M4.03, M4.04, M4.09; #469; K40 fix 3; `issue #535`; Goal 17 slice 9 (#758, #781) |
| model-adapters | Model adapters: model adapters and a stand-in model | building | superagent | beta | coding agent | goal-17 | `packages/agents` | durable-agent-run | slices M4.05, M4.06; the stand-in model is Goal 17 slice 9 (#758, #781) |
| agent-tools | Agent tools: tools from operations; the Run thing | building | superagent | beta | coding agent | goal-17 | `packages/agents` | durable-agent-run | slices M4.07, M4.10; `@orthograph/agents` is built on `goal/superagent` (slice 5), its runtime in slice 9 (#758) |
| agent-writes-handler | Agent writes a handler: an agent writes a handler from a brief | building | framework | preview | — | none | `packages/cli` | — | `ortho brief`, layer 1 check 04; Gate 1; not yet proved by an app's journeys: proved on `acme` only (layer 1 check 04) |
| timers | No wall clock; `Timers`; counted work: in-memory timers and the lint rule, with no world timer table | building | superagent | beta | coding agent | none | `packages/host-cloudflare/src/modules/timers`, `packages/lint` | — | slices M8.06, M8.07; #696 (timers across processes) |
| world-clock-keeper | World clock and keeper: world clock, moves made by time, the keeper | spiked | framework | — | — | none | `packages/host-cloudflare/src/modules/clock` | timers | `design/spikes/world-clock.md`; the rest is M8's |
| gap-signature-collection | Signature collection: stage 3's signature collection and the keeper rest on workflows | provisional | framework | — | — | none | `packages/orthograph` | workflows, safe-hats-budgets | no decision, no spike |

### What the superagent pulls beyond the map above (K42, K40)

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| versions | Versions: things with versions (`versions:`), for Policy, PromptSet and Settings | building | superagent | beta | coding agent | goal-17 | `packages/orthograph/src/modules/things` | things-machines-ops | K40 fix 2; Goal 17 slices 2 and 5; `issue #532`; the form is built on `goal/superagent`, and slice 7 serves it (snag #685) |
| safe-repeats | Safe repeats: `idempotent: { by }` on an operation, so a repeated call settles once | provisional | superagent | beta | coding agent | none | `packages/orthograph/src/modules/operations` | events-in | slice M3.26; Goal 17 slice 11 |
| events-in | Events in: `Blueprint.on`, `on:`, an adapter's `events`; stage 2 also needs them, and until Goal 17's slice 11 they are in no goal | building | superagent | beta | coding agent | goal-17 | `packages/orthograph/src/modules/events`, `packages/orthograph/src/modules/plugins` | principals | slices M5.01, M5.03; no decision, nothing scheduled; `issue #480`, `folds #477`; adapter events carry `id` and `actor` on `goal/superagent` (slice 11) |
| webhook-doors | Webhook doors: signed endpoints with the account and object keys, catch-up polling and `lend` | building | superagent | beta | coding agent | goal-17 | `packages/host-cloudflare`, `packages/orthograph/src/modules/plugins` | secrets, principals | K40 fixes 1, 5, 6; slices M5.01, M5.03; `issue #536`, `folds #534, #538`; the doors at `/_in/<mount>` are built on `goal/superagent` (slice 11) |
| outbox | The outbox: sends retried in order, `agent.tell` through it, and views | provisional | superagent | beta | coding agent | none | `packages/host-cloudflare` | events-in, safe-repeats | slices M5.04 to M5.13; K40 fix 3; `issue #595`; the hold and `onRefused` seams are Goal 17 slices 9 and 11 |
| adapters-from-spec | Adapters from an OpenAPI spec: `ortho new adapter --from-openapi` and the conformance harness | building | superagent | beta | coding agent | goal-16 | `packages/cli`, `packages/generators` | secrets | slice M5.07; Goal 17 slices 3 and 4; `issue #739`, so the five generator gaps Capxul's Bridge adapter found are built here; #601 (merged on `goal/superagent`) |
| adapters-from-abi | Adapters from an ABI: `ortho new adapter --from-abi`, a CLI module over `adapters-abi` | provisional | framework | — | — | none | `packages/cli`, `packages/generators` | adapters-from-spec | #474; `issue #474`; Goal 12 is parked, so Goal 18 ranks it |
| sandbox | The sandbox adapter (`@orthograph/sandbox`): a bridge on the Mac as its stand-in, E2B later | building | superagent | beta | coding agent | goal-17 | `packages/sandbox` | secrets | K40 fix 4; Goal 17 slice 9; #758, Goal 17's claim; #781 (first stretches, in review on `goal/superagent`) |
| service-adapters | Service adapters: the GitHub, Slack and PostHog adapters, generated from each service's spec, and `@orthograph/webhook` for a service with none | building | superagent | beta | coding agent | goal-17 | `examples/superagent/plugins` | adapters-from-spec, webhook-doors | slice M4.25 (Goal 17's); K39; slice 4 merged on `goal/superagent` (#601): GitHub, Slack and PostHog generate and pass against stand-ins |
| superagent-features | The superagent's four features: `@orthograph/superagent`, `intake`, `tickets` and `prompts`, written first inside `examples/superagent/plugins/` | building | superagent | beta | coding agent | goal-17 | `examples/superagent` | principals, versions, ortho-add | K39; Goal 17 slices 5 to 7; slice 5 built (#670); slices 6 and 7 follow |
| superagent-extraction | Extraction: the superagent's plugins moved from `plugins/` into `packages/` and published | provisional | superagent | beta | extraction | none | `packages/` | superagent-features, service-adapters, sandbox | Goal 17 slice 14; K42, sections 2 and 8 |
| derived-reads | Derived reads: `Blueprint.read` with `derive:`, `only:` and `Blueprint.problem`, shown like any read | building | superagent | beta | coding agent | goal-17 | `packages/orthograph/src/modules/derive` | things-machines-ops | `issue #596`; `GOAL17-derived-reads`; the form is built on `goal/superagent` (slice 5), served in slice 7 |
| erc20-adapter | ERC-20 adapter: typed `transfer` and `Transfer` from an ABI (`@orthograph/erc20`, ST2.02) | provisional | Capxul | 1.0 | getting paid | none | `packages/erc20` | adapters-from-abi, chain-evm | `issue #485`; the checks are a draft, #497, and Goal 12 is parked |

### What Capxul pulls (K42, K43)

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| reports | Reports: the books' statements and tables | provisional | Capxul | 1.0 | books | none | `packages/projections` | lists | K42, section 3; K43; Goal 16 slices 7 to 9 |
| lists | Richer lists: filters, sorts, paging and grouping on a read | provisional | Capxul | 1.0 | getting paid | none | `packages/projections` | — | K42, section 3; Goal 16 slices 7 to 9 |
| trees | Trees: a record under a parent, such as a chart of accounts | provisional | Capxul | 1.0 | books | none | `packages/orthograph/src/modules/things` | — | K42, section 3; Goal 16 slices 7 to 9 |
| dates | Dates: calendar days and their arithmetic, apart from the clock; fiscal years and periods are Capxul's things on them | building | Capxul | 1.0 | books | goal-16 | `packages/orthograph/src/modules/values`, `packages/compiler/src/modules/model/internal/{lock-fields,chain}.ts`, `packages/compiler/src/modules/lock/types.ts` | — | K42, section 3; #742, item 5; Goal 16 slices 7 to 9; part one (`Blueprint.day()`, `Days`) green in `values/day.test.ts` and `model/day-value.test.ts`; built once Capxul's journeys run on it |
| record-catalogue | Record catalogue: every record type Capxul takes, 485 ERPNext doctypes across the books, HR, payroll and the CRM, in one list | building | Capxul | 1.0 | books | goal-16 | `examples/capxul/doctypes.md` | — | #748 (merged on `goal/capxul`); `design/decisions/CX-grill.md`; Goal 16 slice 6 (#712) |
| getting-paid | Getting paid: a sales invoice with a pay link, settled only by the chain, its ledger lines posted | provisional | Capxul | 1.0 | getting paid | none | `examples/capxul` | relayer-follower, erc20-adapter, events-in, pages, lists | Goal 16 slice 2 (#428), M7.11; waits on the follower (M6.09) and money (M6.10) reaching `main`, and on the superagent's events and pages (K42, call 9) |
| books | The books: accounts, invoices, payments, journals, the ledger, fiscal years, cost centres, taxes, POS, subscriptions and fixed assets | spiked | Capxul | 1.0 | books | none | `examples/capxul` | record-catalogue, erpnext-scaffolder, companies, reports, trees, dates | 284 doctypes in the catalogue; `spikes/erpnext-doctypes` (#743) scaffolded and ran Payment Entry and GL Entry; Goal 16 slice 7 (#713) |
| hr-people | HR people: companies, departments, job titles and employees | building | Capxul | 1.0 | people and payroll | goal-16 | `examples/capxul` | record-catalogue, companies | #763 (checks) and #786 (handlers), merged on `goal/capxul`; Goal 16 slice 8a (#714) |
| hr-leave | HR beyond people: leave, attendance, shifts, recruitment, appraisals and expenses | provisional | Capxul | 1.0 | people and payroll | goal-16 | `examples/capxul` | hr-people | 124 doctypes in the catalogue; leave (8b) waits on handlers that can list records (#764, case 2 with Goal 17's #758); Goal 16 slice 8 (#714) |
| payroll | Payroll: salary structures, pay runs, slips, benefits and tax | spiked | Capxul | 1.0 | people and payroll | none | `examples/capxul` | hr-people, books | 37 doctypes in the catalogue; the spike scaffolded Salary Slip to `ortho check`; Goal 16 slice 9 (#715) |
| bridge-adapter | Bridge adapter: customers, KYC links, virtual accounts and transfers | spiked | Capxul | 1.0 | banking | goal-16 | `spikes/bridge-adapter`, `examples/capxul` | adapters-from-spec | `spikes/bridge-adapter` (#744), against a stand-in; the generated adapter waits on the five generator gaps in #739, which Goal 16 now builds (`decisions/CX-takeover.md`); Goal 16 slices 5 and 10 (#716) |
| kyc-bank-accounts | KYC and bank accounts: KYC, KYB and bank accounts, opened and kept open through Capxul's own Bridge account | scaffoldable | Capxul | 1.0 | banking | goal-16 | `examples/capxul` | bridge-adapter | #769 (checks, merged on `goal/capxul`, red until the builder's handlers; the builder has started); built in full now, how it is sold comes later (`CX-grill.md`, section 4); Goal 16 slice 10 (#716) |
| incorporation-help | Incorporation help: help forming a company, after the bank accounts | provisional | Capxul | 1.0 | banking | none | `examples/capxul` | kyc-bank-accounts | Goal 16 slice 10 (#716) |
| crm | CRM: Frappe CRM's 40 doctypes, a module switched on later | provisional | Capxul | 1.0 | — | none | `examples/capxul` | adopt-mounted-thing, payroll | 40 Frappe CRM doctypes in the catalogue; Goal 16 slice 11 (#717), after payroll, so no milestone yet |
| erpnext-scaffolder | ERPNext scaffolder: things, machines and journeys scaffolded from a doctype's JSON | spiked | Capxul | 1.0 | books | none | `packages/cli`, `packages/generators` | record-catalogue | `spikes/erpnext-doctypes` (#743): 18 things through `ortho check`, two journeys green; Goal 16 slice 4, then a scaffolder; the framework gaps it found are in #742, a case-2 ask Goal 18 settles |
| gap-optional-columns | Optional columns: nullable and typed columns in D1, and a nullable struct | spiked | Capxul | 1.0 | books | goal-16 | `packages/projections/src/modules/server`, `packages/host-cloudflare/src/modules/store` | erpnext-scaffolder | #742, items 1 to 3: every column is `TEXT NOT NULL`, only text round-trips, a nullable struct reaches D1 as an object; built on `goal/superagent` by #756, not yet in `main`; Goal 16 lands it (`decisions/CX-takeover.md`) |
| gap-wide-things | Wide things: things past D1's 100 columns | spiked | Capxul | 1.0 | books | goal-16 | `packages/host-cloudflare/src/modules/store`, `packages/compiler` | erpnext-scaffolder | #742, item 4; five doctypes are wider (Sales, Purchase and POS invoices; Sales and Purchase orders) |
| gap-books-value-types | Books value types: optional fields, signed money and exact decimals; calendar days are `dates` | spiked | Capxul | 1.0 | books | goal-16 | `packages/orthograph/src/modules/values` | erpnext-scaffolder | #742, item 5; the spike writes each as a raw schema in `values/erpnext.ts` |
| gap-company-roles | Company-wide roles: a role held on Company admits a create | spiked | Capxul | 1.0 | books | goal-16 | `packages/language-effect/src/modules/access` | companies | #742, item 6; #761's runtime half landed in `main` by #768; the compiler half is #767, a case-2 ask Goal 18 settles |
| gap-company-currency | Company currency: money in a company's own currency, with exchange rates | provisional | Capxul | 1.0 | books | none | `packages/orthograph/src/modules/values` | dates | deferred by Aaron's call of 24 November 2026: every Capxul amount is USDC for now (`CX-grill.md`, section 3, #926); unclaimed while parked, its checks draft #923; `M6-money.md` leaves a per-row currency for later; 35 doctypes carry exchange rates; base units stand, and a mismatch is Orthograph's money-units question (`CX-grill.md`, section 3); after M6.10 |
| gap-records-list | Records list: a handler lists records (`Records.list`), with the commit's written rows on its span and a batched unique check | provisional | Capxul | 1.0 | people and payroll | goal-16 | `packages/language-effect/src/modules/records`, `packages/language-effect/src/modules/handler`, `packages/prove/src/modules/journeys`, `packages/prove/src/modules/evals`, `packages/host-cloudflare/src/modules/store` | — | `issue #764`; #759 (a check on extra writes) and #920 (the unique check asks once per row) ride with it; taken by Goal 16 under Aaron's say-so, 24 November 2026 (`decisions/CX-takeover.md`) |

### Stage 4 and the release

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| aztec-club | Aztec club: private club on Aztec | spiked | framework | — | — | none | `spikes/noir-private-core`, `spikes/aztec-club` | — | #504; slices ST4.01 to ST4.08 |
| real-release | Real npm, Homebrew, GitHub releases: a local tap and binary only | building | framework | 1.0 | — | none | `tools/release` | npm-preview | slices M7.02, M7.06, M7.13 |
| ci-signed-verdicts | Signed verdicts: CI-signed verdicts | spiked | framework | — | — | none | `.github/workflows` | — | `spikes/ci-oidc`; slice M7.05 |

### Off the releases' path

The factory and the work board, the bench and the builder's tools, workspaces and the building agents, Stripe and Resend,
and the real vendors. Capxul (M7.10, M7.11) proves 1.0 (K42, K43); it is not a row. The work board and E2B workspaces are
spiked; the rest is provisional.

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| work-factory | Work factory: the factory and the work board | spiked | framework | — | — | none | `examples/work` | — | slices M3.04 to M3.21 |
| bench-builder-tools | Bench and builder tools: the bench and the builder's tools | provisional | framework | — | — | none | `packages/prove` | — | slices M4.11 to M4.14 |
| workspaces-building-agents | Workspaces and building agents: workspaces (E2B) and the building agents; M4.25 is Goal 17's | spiked | framework | — | — | none | `packages/sandbox` | sandbox | slices M4.17 to M4.24 |
| stripe-resend | Stripe and Resend adapters: payments and email | provisional | framework | — | — | none | `packages/stripe`, `packages/resend` | adapters-from-spec | slices M5.04 to M5.13 |
| real-vendors | The real vendors: the builder's staging token and contracts on a testnet | provisional | framework | — | — | none | `.github/workflows/staging.yml` | staging-run | slices M7.07 to M7.09 |

### The framework itself

| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| board | The board: this map, one issue per row and the Project's fields | building | framework | — | — | goal-18 | `docs/canon/status.md`, `tools/github/` | — | Goal 18 slice 2; K42, section 5; #780 (the rows and the dry-run plan); the adoption syntax and the roadmap are this change |
| docs-portal-projections | Docs and portal projections: the docs and the portal as standard projections (K30), built in today | building | framework | — | — | none | `packages/portal`, `packages/projections` | portal-next | K30, K31 |
| gap-core-alone | The core alone: no check proves an app with only the core; the generators import the portal, prove imports the EVM chain port for wallet worlds, and the command depends on the whole projections package | provisional | framework | — | — | none | `packages/generators`, `packages/prove`, `packages/cli` | — | K30, section 1 |
| gap-scheduled-prove | Scheduled prove: proving against a deployed address on a schedule has no slice beyond the staging workflow | provisional | framework | — | — | none | `.github/workflows/staging.yml` | staging-run | no slice |
| gap-journey-language | The journey language's open problems: one world per journey, comparing one answer with the last, and sending malformed payloads | provisional | framework | — | — | none | `packages/prove`, `packages/orthograph/src/modules/journeys` | prove-evals | `design/goals/03-snags.md` |
| gap-slow-m1-checks | Slow M1 checks: two checks are a quarter of M1 test time | provisional | framework | — | — | none | `e2e/m1/29-st1-23-prove-changed.test.ts`, `e2e/m1/30-st1-24-warm-world.test.ts` | — | `issue #623`; 6.7 and 3.1 minutes (`design/decisions/CI-m1-shards.md`); ranks as keeping CI fast |
| gap-portal-ratchet | Portal ratchet: a builder can shrink the new portal's parity lists | provisional | framework | — | — | none | `tools/ci/builder-paths.sh`, `e2e/portal-next` | portal-next | `issue #662`; `e2e/portal-next/expected-failing.txt` and `grid-expected-red.json` are on `main`, and `builder-paths.sh` still lists `e2e/grid/expected-red.json` alone |

## 3. Holes no slice owns

Each hole is a row in section 2, so it is on the board. The rows that start `gap-` are the holes; the rest were already
items.

1. No Node host: `gap-node-host`.
2. Proving against a deployed address on a schedule has no slice beyond the staging workflow: `gap-scheduled-prove`.
3. The blueprint can't declare an approval or a hidden payload field, which generated pieces need:
   `gap-approval-declaration`.
4. Stage 2 needs webhooks (M5.01, M5.03) and SIWE linking (M2.13); neither is in any goal: `webhook-doors` and
   `events-in` (the superagent pulls them now, Goal 17's slice 11) and `siwe-linking` (still in no goal).
5. Stage 3's signature collection and the keeper rest on workflows, which have no decision or spike:
   `gap-signature-collection`, `workflows` and `world-clock-keeper`.
6. The journey language's open problems: one world per journey, comparing one answer with the last, and sending
   malformed payloads: `gap-journey-language`.

Section 4 adds one more, `gap-core-alone`.

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

Each plugin's stage and release are on its row in section 2.

| Plugin | What it is | Row |
|---|---|---|
| `@orthograph/auth` | people, sessions, API keys, the device flow, OAuth for MCP; built today inside the host and the starter | `sign-in` |
| `@orthograph/organizations` | organisations, memberships, invitations, `holds`; built today as starter copies | `teams`, `companies` |
| `@orthograph/handles` | a public name one person holds; built today as Plugged In's own thing | `handles-plugin` |
| `@orthograph/wallets` | keys on a device or a server: make, import, sign, send | `wallets-keys` |
| `@orthograph/web` and the pieces | one UI SDK piece per operation, and the runtime they share (K29) | `web-runtime`, `ui-pieces` |
| docs and the portal | the readers' projections; the new portal is built on UI SDK (K24, K31); built in, to become standard projections (K30) | `docs-portal-projections`, `portal-next` |
| the Safe, budgets and hats plugins | a multisig vault with budgets, for stage 3 | `safe-hats-budgets` |
| `@orthograph/stripe`, `@orthograph/resend` | payments and email adapters (M5) | `stripe-resend` |
| `@orthograph/agents`, `@orthograph/work` | durable agents; the factory (M3, M4) | `durable-agent-run`, `work-factory` |


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
