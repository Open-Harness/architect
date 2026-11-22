# Orthograph: the milestones

Written 17 November 2026, from [`frame/delta.md`](frame/delta.md) and the decisions in
[`decisions/K2-forman-frame.md`](decisions/K2-forman-frame.md). This replaces layers 3 to 5 of
[`build-plan.md`](build-plan.md), its decision steps D4 to D6, the work steps W1 to W3 and the agent track A0 to A9.
Layers 1 and 2 stay in the build plan as the record of what was built.

Aaron's intent: Orthograph is the only focus until it is **workable, at the end of M2**. From there, Capxul's plugins are
built on it, small and reusable, and Orthograph is refined by building them. The factory (M3) and agents (M4) make that
faster but don't gate it.

## What exists on `main`

- **Gate 1 and Gate 2 are green** (`build-plan.md` L1.60 and L2.11; Gate 2's final source passed Linux CI in run
  `44027211261`). Everything runs locally: no cloud.
- **Declare and call.** Things, machines, operations, roles, events, journeys and starting worlds in `blueprint/`; the
  compiler, the model, and the generated server, SDK, CLI, MCP, docs and portal (`packages/compiler`,
  `packages/generators`).
- **Prove and ship.** Worlds, journeys and nine evals; verdicts signed by CI into the logbook; versions from the model
  diff; `promote`, `publish` to Verdaccio and a local tap, and `watch` (`packages/prove`, `packages/logbook`).
- **Auth.** Better Auth on D1 inside `packages/host-cloudflare/src/modules/auth`: people, sessions, API keys, the
  device flow, OAuth for remote MCP. Organisations, memberships and invitations are copied into each project by the
  starter (`packages/preset`).
- **Examples.** `examples/acme` (the allowance) and `examples/work` (F5: 6 things, 26 operations, one blank). A fuller
  work app is on `spike/work-real`.
- **Codex's unmerged work** on `layer/4`: `D4.md` (kits and dependencies) and author checks `e2e/layer3/00` to `06`
  plus `99`, red for readiness, never green.
- **Not built anywhere:** plugins and mounts, adapters, the `agent`, `service` and `system` principals, secrets read by
  handlers, the agents feature (no `packages/agent`), the factory loop, a Solidity language beyond a placeholder, and
  any cloud destination.

## How a milestone works

The build plan's rules, unchanged except for names:

1. **One slice, one session.** A slice ends green: every existing check passes. It is proved by its *done when*, a
   command and its expected output. A slice that won't fit a session is split before it starts.
2. **Gates.** Each milestone ends in one e2e suite, `nx run e2e:m<n>`. A milestone is done when its gate
   passes on `main` from a clean checkout, locally and in CI. A slice starts once what it `needs` has landed, in any
   milestone order (K34). **After Gate M2 the order is by stage** ("v1.0: four
   stages" below, K9): a stage's slices may come from any milestone, and each stage ends in its own gate.
3. **Decisions just in time.** A decision slice sits right before the first slice that needs it and ends with a record
   in `design/decisions/`.
4. **Checks first.** A checks slice (journeys and checks) is written by a different agent from the builder, and fails
   on empty handlers before the build slices it judges start. Builders never edit it.
5. **One branch, one pull request.** A milestone runs on `m<n>`, one commit per slice, merged when CI is green, the gate
   passes and a 🔍 reviewer passed it. Ideas for later go in `later.md`.

Kinds: **decision**, **spike**, **checks**, **build**, **e2e**. ∥ marks a slice that may run beside the one before it.
Names below are today's, Orthograph's (K6, `naming.md`).

## v1.0: four stages

Aaron, 18 November 2026: one example grows through four stages, "each stage is a meta milestone. All of them is
v1.0" ([`decisions/K9-growing-example.md`](decisions/K9-growing-example.md)). The app is Plugged In (`plugged-in`), in
`examples/plugged-in`. The milestones below keep their slices and ids; this section says which slices each stage needs,
adds the slices no milestone had (ids `ST<stage>.<n>`), and gives each stage its gate. Each passing stage is tagged
`plugged-in/stage-<n>`.

**Renamed by K15** (19 November 2026, Aaron): the example app is **Plugged In** (`plugged-in`), no longer `links`. This file is updated in place: `examples/plugged-in`, the tags `plugged-in/stage-<n>`, the command `plugged-in`.
Codex's branch `links/stage-1` (#56) keeps its name. [`decisions/K15-plugged-in.md`](decisions/K15-plugged-in.md).

**Three releases** ([`decisions/K28-releases.md`](decisions/K28-releases.md), Aaron, 21 November 2026). The **preview** is Gate M1 on `main` and
the `@orthograph/*` packages, `orthograph` and the preset on npm under `next` (M1.51). The **beta** is stage 1: Gate M2 (M2.12) and Goal 3's staging run. **v1.0** is
the beta plus stages 2 to 4 and the release, as the next paragraph says.

**v1.0** is the four stage gates on `main`, plus the release: M7.01 to M7.04, M7.06 and M7.13 (the cloud passes for staging and for the release, the npm
release, the infra projection, a deploy and destroy that leaves nothing, real releases), each credential with Aaron's
written yes.

| Stage | A person can… | Needs from the milestones | Its own slices | Gate |
|---|---|---|---|---|
| 1 · Plugged In | claim `@name`; a public page of links | all of M1 and M2 | M1.22, M1.23 (moved in by K29), ST1.02 to ST1.04, ST1.06 to ST1.08, ST1.25 to ST1.28 (ST1.05 moved to M3 by K13) | Gate M2 (M2.12) |
| 2 · wallets | create or link a wallet; be paid by handle | K7's wallet slices (M1.27 to M1.32, and M2.13 for linking), M6.01, M6.02, M6.07, M6.09, M6.15, M6.18, M5.01, M5.03 | ST2.01 to ST2.05 | ST2.06 |
| 3 · the vault | a Safe with the budgets plugin; hats with budgets; owners sign above a budget | M6.10 to M6.14, M6.16, M6.17, M6.21, M3.01 to M3.03, M4.01 to M4.10, M4.16, all of M8 (time: its budgets are per month, K23) | ST3.01 to ST3.07 | ST3.08 |
| 4 · the club | stage 3 on Aztec: private members, private spends, private ballots | (Later's Noir line, brought in) | ST4.01 to ST4.07 | ST4.08 |

**Beside the stages, off v1.0's path:** the factory (M3.04 to M3.14), the builder's tools and the bench (M4.11 to
M4.14), workspaces, experiments and the building agents (M3.20, M4.17 to M4.25, K10; M4.25 built by Goal 17, K39), views, Stripe, Resend, adapters from OpenAPI, MariaDB and a second app (M5.05 to M5.09, M5.11, M5.13), the
`examples/workshop` (M6.20, dropped by K9), and Capxul (M7.07 to M7.11). They run when a thread is free; a stage
never waits on them.

**The gates of M3 to M6 no longer order the work.** Their suites still run, beside, once their slices exist. Where a
slice's `needs` named one of those gates, it is read as below; K34 rewrote the ones that only said milestone order:

| Slice | Its `needs` said | Read it as |
|---|---|---|
| M6.01 (stage 2's chain decision) | Gate M5 | none: started 20 November 2026 (K26, Aaron's exception) |
| M5.01 (the decision M5.03 needs, for stage 2's follower events) | Gate M4 | none (K34): a decision |
| M3.01 (workflows, stage 3) | Gate M2 | none (K34): a decision; the engine is the one the workflows spike proved (#289) |
| M4.01 (agents, stage 3) | Gate M3 | none (K34): a decision |
| M7.01 (the cloud pass for staging) and M7.13 (the release pass) | Gate M6 | M7.01: Gate M2, so M7.01, M7.03, M7.04 and M7.08 run for staging on the dedicated account (K10, Aaron's Q6). M7.13: M7.01 alone (K34), and every other M7 slice needs it |

Everything downstream of these five follows from them: M6.02 and the K7 wallet slices from M6.01, M5.03 from M5.01,
M3.02 and M3.03 from M3.01, M4.02 to M4.10 and M4.16 from M4.01, M7.03, M7.04 and M7.08 from M7.01, and M7.02, M7.05 to M7.07 and M7.09 to M7.11 from M7.13. None of
them needs a factory, bench or M5 slice.

### Stage 1: Plugged In

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M1.23 | The port from agent-native, part one (moved into stage 1 by K29; K5, "Porting from agent-native"; K9): `defineAction` with agent-native's field names and approvals, in `orthograph`'s `actions` module, in Effect. Approvals live in the wrapper, never in `run`, so a host that asks first never asks twice. `ActionRefusal` carries `actionContractError`, `noWrite`, `errorCode`, `statusCode: 422` and `details`, the shape agent-native reads (K9); the registry lists every action with its input schema (`list`, F8) | M1.12 | build | a generated action refused by the role check writes nothing and returns the typed refusal; one with `needsApproval` waits for a yes; with approval already given by its host, `run` runs once and asks nothing; `list` returns every generated action with a non-empty input schema | S |
| M1.22 | The actions projection (moved into stage 1 by [`decisions/K29-ui-layer.md`](decisions/K29-ui-layer.md); K5 seam 5, corrected by K9 from `spikes/agent-native-compat/`): one module per operation exporting `options(host)` in agent-native's field names, never a `defineAction` call; `host` supplies the SDK client, the caller and `requestKey(ctx)`; `run` turns a declared refusal into the no-write `ActionRefusal` and redacts defects; no `retrySafe: true`; payload schemas through Effect's Standard Schema and Standard JSON Schema, optional fields as `optionalKey`; our portal wraps each with our `defineAction` | M1.12, M1.23 | build | an action's `run` refused by the role check returns the same typed refusal as the SDK; an operation `.notVia(Via.agent)` has no agent tool; a type test checks each generated `options(host)` against the field list and the no-write error's fields recorded from agent-native 0.228.2, with no agent-native package installed; every generated action advertises non-empty parameters | M |
| ST1.01 | **Replaced by ST1.25** (K29: the web projection, one UI SDK piece per operation, in place of React hooks). Was: the react projection, `@orthograph/react`, one hook per operation and read, `--through react` | — | — | not built | — |
| ST1.02 | Journeys for `handles` and Plugged In at stage 1: claim, a taken name, one request twice, release, resolve; add, order and remove a link; a stranger can't edit; anyone reads a page | M1.40 | checks | they fail on empty handlers | M |
| ST1.03 | `@orthograph/handles`, a feature: handle, claim, release, resolve, `HandleTaken`, a `names` choice; mounted by `ortho add` | ST1.02 | build | the handles journeys pass with `examples/plugged-in` mounting it | M |
| ST1.04 | `examples/plugged-in` (M1.40, with M1.43's handlers) grown to stage 1 on auth copied from the starter: `profile`, `link`, their handlers, and three screens in `src/web/` (`/@name`, `/claim`, `/edit`) built on the generated pieces, with the app's own link list (K29; declared as a component once the map language lands, K36), served by the Worker | ST1.25, ST1.03, M1.40 | build | `ortho prove --root examples/plugged-in` is green; in Chromium a claim and a link show on `/@aaron` | M |
| ST1.06 ∥ | Pieces behind a signed-in session (`Via.session`) | ST1.25, M2.06 | build | the Plugged In screens sign in and claim through the pieces with the auth plugin mounted | S |
| ST1.07 | Plugged In mounts auth: the copied identity deleted | M2.05, ST1.04 | build | `examples/plugged-in` has no `person/` or `session/` folder and proves green | S |
| ST1.08 ∥ | `examples/signup` deleted once the canon quotes Plugged In (the canon thread's change, K9); `e2e/layer1/08-*` moved onto Plugged In. A checks slice: it edits a gate's suite, so an author writes it, never the builder | ST1.04 | checks | no file outside the records names `examples/signup`; `e2e/layer1/08-*` proves Plugged In | S |
| ST1.25 | The web projection ([`decisions/K29-ui-layer.md`](decisions/K29-ui-layer.md), in place of a react projection): `@orthograph/web`, the browser host (the SDK's layer, the caller from UI SDK's change source, one `requestKey` per form open kept across retries, a person to ask) and the piece runtime; one generated UI SDK piece per operation in `generated/web/<thing>/<verb>.ts`, a framework-free primitive bound to its generated action, with its React parts beside it (React only in the beta, K29); a read, a move and a write each as K29 section 3 draws them; `generated/web/` may import `@ui-sdk/*`, `react` and `@orthograph/web`, and nothing else in `generated/` may; `--through web` replays a journey through the pieces in headless Chromium, never jsdom; `ortho/no-ui-in-worker` carved out for `generated/web/`, with check 26 still holding the Worker line | M1.22, ST1.26 | build | Plugged In's `a name is claimed once` passes `--through web` with the same verdicts as over HTTP; a taken name shows `HandleTaken` with `HN-001` under the field and fails an agent's step with it; an agent's step on a piece that needs a yes waits for a person; a read loads again after a write on its thing; the pending state is observed before the answer | M |
| ST1.26 | Checks for the web projection (K29), written first by an author on Plugged In against empty pieces: a name claimed once `--through web`; a taken name shows `HandleTaken` with `HN-001` under the field and fails an agent's step with it; a release waits for a person's yes; a read loads again after a write on its thing; the pending state is observed before the answer. A checks slice: an author writes it, never the builder | M1.40 | checks | they fail with the web projection empty | S |
| ST1.27 | Retire the old client at cutover (K29 section 7, K31, Goal 6's last slice), once Goal 6's parity list is empty and Goal 3's lead has agreed the freeze on an Ask issue in Goal 3's milestone: one change into `goal/stage-1` serves `packages/portal-next` at `/portal` through `@orthograph/portal/server` and deletes the old client, `@orthograph/portal-ui`, the HeroUI peers, `pro.mjs`, `sheets.mjs`, the gated typecheck, CI's licence step and cache, and `ortho/no-pro-outside-portal-ui`; `e2e:portal-next` folds into the portal's checks. Merged with Goal 3's lead's yes and a 🔍 pass | ST1.28 | build | ST1.28's checks pass; checks 21, 26, 27 and 28 and the grid's portal evals pass on the one client; an agent's `snapshot()` on the portal lists the search, the tree and the tabs by name | S |
| ST1.28 | Checks for the portal off HeroUI (K29): check 15 rewritten to "only `@orthograph/web`, `@orthograph/shell`, `packages/portal-next`, `generated/web/` and an app's `src/web/` import `@ui-sdk/*`, nothing a Worker reaches imports them, and nothing imports `@heroui/*` or `@heroui-pro/*`"; a planted HeroUI import anywhere fails lint; `portal-ui` and the portal build with `HEROUI_AUTH_TOKEN` unset. A checks slice: an author writes it, never the builder | — | checks | they fail on `goal/stage-1` for HeroUI's imports only, and gate ST1.27; checks 21, 26, 27 and 28 still pass | S |

### Stage 2: wallets

The wallet's shape is K7's ([`decisions/K7-chain-languages.md`](decisions/K7-chain-languages.md), "The wallet plugin";
its forks F1 to F5 are working assumptions until Aaron answers them).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST2.01 | Journeys for stage 2: create on the device, link your own, pay by handle, confirmed then corrected, an agent can't link | M6.02 | checks | they fail on empty handlers | M |
| ST2.02 ∥ | Adapters from an ABI (K7 Q2): `ortho new adapter --from-abi`, typed calls and events, a stand-in contract deployed into the world; the first is `erc20` over a test token | M1.30, M1.31 | build | the `erc20` adapter's transfer and `Transfer` event are typed; a revert decodes typed; conformance passes against the stand-in | M |
| ST2.03 ∥ | Pieces for client operations and chain submissions: the submission lifecycle as piece state (`simulated`, `submitted`, `included`, `confirmed`, `dropped`, `reverted`, `corrected`); the wallet's device half in the browser | ST1.25, M1.27, M6.15 | build | in Chromium a payment's piece passes through each state to `confirmed`; a reorg shows `corrected` | M |
| ST2.04 | Plugged In at stage 2: `/wallet`, Pay @name, `payment` kept from the follower's events through `on:` | ST2.01 to ST2.03, M2.13, M6.09, M5.03 | build | the stage 2 journeys pass | M |
| ST2.05 ∥ | The gates' fixture moves from acme to Plugged In; acme retired (its allowance kept in the history as the budgets feature's source). A checks slice: it rewrites the gates' suites, so an author writes it, never the builder | ST2.04 | checks | every gate suite runs on Plugged In; `examples/acme` is gone; Gates 1, 2, M0, M1 and M2 still pass | L |
| ST2.06 | **The stage 2 gate** | ST2.01 to ST2.04, and the stage's milestone slices | e2e | on Anvil: aaron creates a wallet, bob links his; bob pays `@aaron` 5 test tokens, simulated first; the page shows it once confirmed; a forced reorg corrects it; the key-hygiene check passes; an agent's link is refused. `plugged-in/stage-2` tagged | S |

### Stage 3: the vault

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST3.01 | A Safe, Hats Protocol and a module on Anvil: their releases pinned (R1), a module enabled on a Safe executing after a Hats read, the SafeTx signature format | ST2.02 | spike | `spikes/safe-hats-module/README.md` answers it with a run | S |
| ST3.02 | The budgets feature: a budget per hat and period, what lives in D1 and what on chain, signature collection as a workflow, an agent under its own hat | ST3.01, M6.01, M3.01 | decision | `decisions/ST3-budgets.md` written | S |
| ST3.03 | Journeys for stage 3 (the gate's list below), and the budgets machine's reference for the fuzz | ST3.02 | checks | they fail on empty handlers | M |
| ST3.04 ∥ | The `safe` and `hats` adapters from their ABIs | ST2.02, ST3.02 | build | a Safe's owners and threshold and a hat's wearer read typed from the world | M |
| ST3.05 | `@orthograph/budgets`: acme's allowance machine as a feature; its on-chain half one Solidity module generated by `language-solidity` and filled; the fuzz against the TypeScript machine | ST3.03, ST3.04, M6.13 | build | `forge test` passes on the module; fixed seeds show no divergence; within-budget spends execute from the Safe | L |
| ST3.06 | Owner signatures as a durable workflow: propose, collect each owner's signature, execute at the threshold, await the confirmed event | ST3.05, M3.28, M6.15 | build | a 2-of-3 spend executes once, even when the workflow's Durable Object is evicted mid-wait | M |
| ST3.07 | Plugged In at stage 3: `/@group`, hats, spend, pending; an agent spending under its own hat | ST3.06, M4.10, M4.16, M2.07 | build | the stage 3 journeys pass | M |
| ST3.08 | **The stage 3 gate** | ST3.01 to ST3.07, and the stage's milestone slices | e2e | on Anvil, `@workshop` has a 2-of-3 Safe with the module enabled: ada wears the spender hat at 100 a month and spends 20 alone; 500 waits for two owners and executes once across an eviction; a revoked hat refuses with `HatNotWorn`; ada's agent under its own 20 hat spends 20 and is refused 21; the fuzz finds no divergence. `plugged-in/stage-3` tagged | S |

### Stage 4: the club

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST4.01 | The budgets declaration in Noir on Aztec: a private budget note spent down, a private ballot with a public tally, in an in-process `proofs: "verified"` network (K7 Q7) | none (K34): it reads the budgets declaration in `examples/budgets` | spike | `spikes/aztec-club/README.md` answers it with a run, a tampered proof rejected | S |
| ST4.02 | `language-noir`, the `aztec` store kind, `chain-aztec` on the `ChainPort`, `proofs: "verified"` worlds, from K7's design | ST4.01 | decision | `decisions/ST4-aztec.md` written | S |
| ST4.03 | Journeys for the club | ST4.02 | checks | they fail on empty handlers | M |
| ST4.04 | `chain-aztec`, and Aztec in a world with proofs verified; its `ChainPort.clock` (K23: a warp, then the L1 blocks finality needs) | ST4.02 | build | a world's Aztec network rejects a tampered proof and is gone when the world ends | M |
| ST4.05 | `language-noir`: private notes, one-use claims, enqueued public calls; the budgets feature's Aztec choice from the same declaration | ST4.04, ST3.03, ST3.05 (K35) | build | the budgets journeys pass on Aztec with `choose(onChain.aztec)` and no change to the declaration | L |
| ST4.06 ∥ | `@orthograph/ballots`: private ballots, one per member, public tally (K7's governance contract as a feature) | ST4.05 | build | a second ballot by one member is refused by its claim | M |
| ST4.07 | Plugged In at stage 4: `/@club`'s public footprint, the members' area, private spends and ballots; casting is `.notVia(Via.agent)` | ST4.05, ST4.06 | build | the club journeys pass; the portal shows nothing that names a member | M |
| ST4.08 | **The stage 4 gate** | ST4.01 to ST4.07 | e2e | in a verified world: three private members join; one spends 20 privately and the footprint shows the total, not the member; 500 passes by private ballot with a public tally; a second ballot is refused; a tampered proof is rejected. `plugged-in/stage-4` tagged | S |

## M0: Land and rename

**Goal.** One name and one vocabulary, with nothing broken.
**Ships.** The frame on `main`; `@orthograph/*` packages; the `ortho` command; the design docs rewritten around plugins
and [`frame/story.md`](frame/story.md).
**Gate.** `nx run e2e:m0` runs the Gate 1 and Gate 2 suites under the new names, plus a name check: none of the old names (the
package scope, the command, the variable prefix and the folder, listed in
[`decisions/M0-packages.md`](decisions/M0-packages.md) section 4) outside the records. "History" in this section means
the records listed in [`decisions/M0-packages.md`](decisions/M0-packages.md) section 5: `design/history/`, the decision,
evidence, brief, wayfinding, spike, Noir and state records, the layer 1 and 2 build plan, and `spikes/`.
**Goal file.** [`goals/02-m0-land-and-rename.md`](goals/02-m0-land-and-rename.md).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M0.01 ✅ | The package map: each package's `@orthograph` name per K2 Q4 (front door `orthograph`; `language-effect`, `language-solidity`, `host-cloudflare`, `portal`; which internal packages ship inside the front door) | Gate 2 | decision | `decisions/M0-packages.md` written. **Proof:** [`decisions/M0-packages.md`](decisions/M0-packages.md) | S |
| M0.02 ✅ | Rename packages and imports; `target-*` becomes `language-*`; Nx tags follow | M0.01 | build | `nx run-many -t check test` green; `rg` finds the old package scope nowhere outside history. **Proof:** [`evidence/M0.02/`](evidence/M0.02/): 16 projects' lint, typecheck and test, `sync:check`, the scope search empty | M |
| M0.03 ✅ | The command, folders and variables: `ortho`, `.ortho/`, `ORTHO_*`; the config file renamed `ortho.config.ts` and its unread `outputs` removed (D3 #112) | M0.02 | build | `nx run e2e:layer1` and `e2e:layer2` pass, renamed. **Proof:** [`evidence/M0.03/`](evidence/M0.03/): Gate 1, 7 files, 19 passed and check 4's agent skipped for want of a key, as on any keyless run (D2 #41); Gate 2, 8 files, 10 passed | M |
| M0.04 ✅ | A lint rule against the old names | M0.03 | build | the rule fails on a planted import from the old package scope. **Proof:** [`evidence/M0.04/`](evidence/M0.04/): `ortho(no-old-names)` names the planted import and exits 1; the rule runs in this repository's own lint and in `ortho check` | S |
| M0.05 ∥ ✅ | Design docs rewritten: plugins instead of kits, the story as the spine; `build-plan.md` marked superseded from layer 3 | M0.01 | build | the docs build and their link check passes; "kit" (the word for a plugin) appears only in history. **Proof:** the docs are one page, [`docs/index.html`](docs/index.html), ported from Orthograph Docs ([`decisions/M0-build.md`](decisions/M0-build.md) #7 to #10); `nx run docs:check` ([`evidence/M0.05/`](evidence/M0.05/)); `build-plan.md` line 4 already points layers 3 to 5 here | M |
| M0.06 ✅ | **Gate M0** | M0.04, M0.05 | e2e | `nx run e2e:m0` passes on `main` | S |

**Gate M0 proof:** a clean clone of `m0` at `091cc86` passes the workspace check, `sync:check`, `docs:check` and `nx run e2e:m0` ([`evidence/M0.06/`](evidence/M0.06/)); CI runs the same on [#32](https://github.com/Open-Harness/orthograph/pull/32) and on `main` (jobs `check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`).

The npm org `@orthograph` is not needed until the preview (M1.51, K28): every milestone before it publishes to the local Verdaccio.

## M1: The complete model and plugins

**Goal.** A plugin is a package mounted with one file, the model holds everything declared, and every verdict knows
exactly what it judged.
**Ships.** Plugin descriptors (`Blueprint.feature`, `Blueprint.adapter`, `Blueprint.projection`), mounts under
`blueprint/{features,adapters,projections}/`, the mount verbs (choose, include, narrow, omit), needs, choices and
settings, `ortho add`, adapter calls out as steps, stores (K3), the three trace fixes (O2), model, api and server re-homed as plugins,
the first real plugin, `@orthograph/wallets`, on `@orthograph/chain-evm` with Anvil in worlds (K7 F4), and the Plugged In app
dogfooded end to end, every output checked for the basics, seen in the portal (K13)
([`frame/mounting.md`](frame/mounting.md), [`frame/projections.md`](frame/projections.md)).
**Gate.** `nx run e2e:m1`: (1) Codex's checks `00` to `06`, renamed, pass: a fixture plugin mounted with one command,
its typed SDK and MCP answer, collisions are refused, the graph is whole; (2) acme with its projections mounted
generates the same `generated/` as before, byte for byte except header paths; (3) editing one handler makes only that
operation stale; (4) `ortho describe --json` lists acme's journeys, starting worlds, role rules and the work app's
blank; (5) a fixture feature brings its own store, and a call writing two stores is refused (K3); (6) a commit has its
own span, free text is absent from spans, and refused calls are counted (O2); (7) `acme wallet create && acme wallet send`
confirms on Anvil in a world, signed from the CLI and from a server-held key (K7 F4). (8) no secret field leaves through any output, for any audience (K12); (9) the Plugged In loop (M1.41) passes through the
real `ortho` binary, and the portal opens on Plugged In's things (K13).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M1.01 | The plugin descriptor, harvested from D4 sections 1 to 3 under the frame's words: three kinds, mount files named by path, the verbs, choices against settings, `Blueprint.need(x, { when })`, runtime entries per host | Gate M0 | decision | `decisions/M1-plugins.md` written | S |
| M1.02 | Port `layer/4:e2e/layer3/00` to `06` and their fixtures to `e2e/m1` in the new words | M1.01 | checks | they run and fail for the right reason on `main` | M |
| M1.03 ∥ | The complete model: journeys, starting worlds, role rules and operations with blanks (marked) are in it (`describe.ts:99`) | Gate M0 | build | `ortho describe --json` on acme and work lists them all | M |
| M1.04 ∥ | Verdicts keyed by the model's hash and each handler body's hash, one per operation per journey | M1.03 | build | editing `src/allowance/spend.ts` makes `ortho impact` name `allowance.spend` alone | M |
| M1.05 | The descriptors in `orthograph` (Effect-only, per the package rules) | M1.01 | build | a fixture feature, adapter and projection type-check; a wrong field fails to compile | S |
| M1.06 | Mounts: the compiler reads the three folders, names from paths, folds each plugin's declarations into the model | M1.05 | build | check `01` passes | M |
| M1.07 | The verbs: choose, include, narrow, omit | M1.06 | build | a fixture narrowed and with one operation omitted generates without it | M |
| M1.08 | Needs and collisions: needs resolved or refused by name; clashing names refused | M1.07 | build | checks `05` and `06` pass | M |
| M1.09 ∥ | Runtime entries per host and import closures (`worker`, `node`) | M1.08 | build | check `02` passes | M |
| M1.10 | `ortho add feature\|adapter\|projection`: pins exactly (three-day rule, R1), writes the mount, offers needs | M1.08 | build | check `01` passes through one command | S |
| M1.11 | Projections as plugins, part one: model, api, server | M1.10 | build | acme mounts them; its `generated/server` is unchanged | L |
| M1.12 | The SDK contract ([`decisions/K5-the-whole-shape.md`](decisions/K5-the-whole-shape.md) seam 5): the caller on the client's layer, a stable `requestKey` across retries, declared refusals typed in the error channel; every output through M1.35's visibility rule. Moving sdk, cli and mcp into mounted plugins is M3.22 ([`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)) | M1.11, M1.35 | build | acme's generated clients unchanged apart from the new options; the CLI and MCP journeys still pass; a retried SDK call with one `requestKey` commits once; a declared refusal is typed in the SDK call's error channel | S |
| M1.34 ∥ | One package behind the portal's components ([`decisions/F7-portal-ui-seam.md`](decisions/F7-portal-ui-seam.md); HeroUI leaves in ST1.27, K29): `@orthograph/portal-ui` at `packages/portal-ui`, the only importer of `@heroui-pro/react`, which it takes as a peer dependency and never bundles, exporting our names (`Shell`, `Board`, `Grid`, `Chart`, `Stat`, `Card`, `Widget`, `Timeline`, `Command`, `Code`, `Markdown`, `Editor`, the `Chat` parts) for the portal's pages and the Factory face; `no-restricted-imports` bans `@heroui-pro/*` in every other package and in generated code (spikes exempt); CI installs Pro from the `HEROUI_AUTH_TOKEN` secret (created by Aaron, 19 November), cached by lockfile, never on fork pull requests | M1.25 | build | `portal-ui` builds in CI with Pro installed from the secret, and nothing of Pro is committed or in its packed `dist`; a planted `@heroui-pro/react` import in `packages/portal` fails lint; a fork's pull request runs no job that reads the secret | S |
| M1.13 ∥ | Part three: docs and the portal as a viewer ([`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)), our design (M1.25) on the pieces ported from agent-native (K5 seam 10), every component from `@orthograph/portal-ui` (M1.34): the shell's frame (the tree, the top bar with environment, window and search, the live rail, the drawer; the chat, "Needs you" and screen context stay in M1.24); things and lifecycles first, drawn from the model; live evidence lights up the same structure, as [`portal.md`](portal.md) draws it; the operations matrix (p95 against the declared `budget.p95`); the trace drawer's folding waterfall; spans kept to structure and timing; `TraceSource.window(since, now)` at a fixed `now` for tests and screenshots; a proof tab on M1.04's verdicts (no eval timing; latency is the live p95); every part of the wire M1.42 adds (`from`, events with their fields, errors with codes, field visibility and descriptions, step details) and the rest K12 section 6 names (journeys, starting worlds, stores, mounts, role rules, `runs` and the test hook, environments). Calls and door refusals come from `ortho.calls`, never an HTTP span; retries group by `attempt` and `<op>.commit`; database steps by `step.kind`. Faces and notes are M3.21 | M1.03, M1.04, M1.11, M1.17, M1.21, M1.25, M1.34, M1.35, M1.36, M1.42 | build | acme's docs unchanged and Plugged In's docs generated; the portal opens on Plugged In's things and the rail is scoped to the page, and a journey's run lights up its operation and machine move; the "no leak" check plants a raw statement, a `principal.person`, a non-public payload value and a log body in a staging trace and none renders, while the caller's kind does; the portal's screenshots are byte-identical across two runs at the same `now` | L |
| M1.14 ∥ | Adapter calls out: `Blueprint.step.call`, declared errors, the one mapping blank, a stand-in declared (D4 section 3) | M1.08 | build | checks `03` and `04` pass | M |
| M1.16 ∥ | `ortho prove --empty`: the journeys run against scaffolded handlers; each step that needs behaviour goes red, and one that passes is labelled "proved by the description" (S3) | Gate M0 | build | on acme, `revoke then spend` shows two red steps and one proved by the description | S |
| M1.17 ∥ | Stores ([`decisions/K3-stores-and-sources.md`](decisions/K3-stores-and-sources.md)): `Blueprint.store.<kind>()` under `blueprint/stores/`, `lives` takes a store or nothing for the default, kinds supplied by hosts (`database`, `actor`), `stores:` bindings typed in environments, one store per commit (cross-store writes refused), migrations per store, a feature's own stores named by its mount | M1.06 | build | acme unchanged; a fixture feature with its own store mounts beside acme's default and both migrate; an operation writing two stores fails to compile | M |
| M1.18 ∥ | The commit as a span ([`decisions/O2-trace-gaps.md`](decisions/O2-trace-gaps.md) gap 1): `<op>.commit` with `commit.writes`, `commit.entries`, `commit.outcome`, and `attempt` on the operation's span | Gate M0 | build | a forced conflict shows `attempt=2` after a `conflict` commit; a journey asserts `allowance.spend.commit` | S |
| M1.19 ∥ | Free text untraced unless marked (O2 gap 2): `Blueprint.traced(x)`; ids, amounts, enums, booleans and times traced when public | Gate M0 | build | `payload.memo` is absent from `spend`'s span; a traced text field is present; the "leaks nothing" eval passes | S |
| M1.20 ∥ | Every call counted (O2 gap 3): `ortho.calls` and `ortho.call.duration` through Effect `Metric` to OTLP; the local Collector gains a metrics pipeline | Gate M0 | build | a bad payload and a stranger show as two refusals in `ortho.calls`, with no spans | S |
| M1.21 ∥ | Live steps (K5 seam 10): a step signal as each step starts and ends, sent under `waitUntil`, not at dispose; committed events read from the journal for the portal | M1.18 | build | a slow handler's `load` step shows in the portal before the response; a committed event shows with its commit, a refused call shows none | S |
| M1.25 ✅ | The portal's design, with Aaron (UX.md's intent; agent-native's templates as the reference). Aaron asks to see UX before it is drawn, so this is his session by his rule, not a block | Gate M0 | decision | `design/portal.md` agreed: the first page, a thing's page, an operation's page, the live rail, the chat. **Proof:** [`portal.md`](portal.md), agreed 19 November 2026; the drawing in [`spikes/portal-mock`](../spikes/portal-mock/README.md) | M |
| M1.26 ∥ | The scaffold as a wired function (K5 seam 3): each declared step in declared order, the move, a stub per refusal, every hole a `Handlers.blank`; `Blueprint.step.<kind>({ optional: true })`, allowed absent by eval 6; `ortho check` warns on a non-optional step the handler never calls; `ortho prove` reports an optional step no journey ran both ways | Gate M0 | build | a fresh scaffold compiles and `ortho prove --empty` shows one red step per blank; a fixture with an unchanged edit that skips its optional `save` passes eval 6; a fixture whose journeys always run its optional step is reported as never exercised both ways; deleting `steps.record` from `spend` gives a check warning | M |
| M1.27 ∥ | Operations that run on the device (K7, ledger `LAH-02`, `G-10`): the compiler accepts `runs: "client"` (`describe.ts:108` refuses it today) for an operation whose plugin supplies `node`, `browser` and `world` entries, adding the `browser` and `world` host entries M1.09 doesn't cover; the generated client runs it in-process with its steps as spans | M1.09, M1.14 | build | a fixture plugin's client operation runs from the SDK and the CLI with no server call, and shows its steps in the portal; one missing its `browser` entry is refused | M |
| M1.28 | Journeys for the wallet plugin's first version (K7 F4), written by a different agent: create and import a key, list keys, sign, send on Anvil and see it confirmed, a doomed send refused before sending; one journey per host signer | M1.01 | checks | they fail on empty handlers | M |
| M1.29 | `@orthograph/wallets`, the first real plugin (was M6.03, L3.02): `create`, `import`, `keys`, `sign`, `send`; one `Signer` per host: `browser` (EIP-1193), `node` (encrypted keystore), `keystore` on a server (a server-held key; in M1 only a world-generated test key, real secrets come with M2.04 and the hygiene check with M6.18), `world` (test wallets); each wallet declares where its key lives (K7 F5); values are CAIP-10 accounts | M1.27, M1.28, M1.30, M1.31, M1.32 | build | `acme wallet create && acme wallet send` confirms on Anvil from the CLI, and from a server operation signing with a world-generated server key | M |
| M1.30 | The chain adapter `@orthograph/chain-evm` (was M6.05, L3.04): the per-family `ChainPort` (prepare, simulate, sign, submit, track), its transaction manager, nonces, viem error mapping and event streams vendored from `@prb/effect-evm` (MIT, notice kept), reshaped to our module shape with every wait through `Timers`; `ChainFault` typed; receipts as spans (K7) | M1.14 | build | a fixture ERC20 transfer on Anvil; a revert decodes typed; an empty revert arrives as `ChainFault`; a hand-written `viem` import outside `chain-evm` fails lint | M |
| M1.31 | Anvil in a world (was M6.06, L3.05): `Stand.process`, always `--silent`; a process in CI too, never a container (K10 section 8) | M1.30 | build | a world's chain answers `eth_chainId` and is gone when the world ends; nothing it printed holds a key | M |
| M1.32 ∥ | Simulation, mandatory before every send (was M6.08, L3.07): plain `eth_call`, which works on Anvil (K7 Q5) | M1.30 | build | a reverting call returns its typed error and sends nothing; no SDK path sends without simulating | S |
| M1.33 ∥ | Processes, not containers (K10 section 8; Aaron quit Docker, 18 November): the Collector as its pinned binary, Verdaccio under Node, an OIDC issuer process of our own over `jose` in place of the navikt image, each started by its world as `Stand.process` and owned by PID; the Grafana viewer removed in favour of the portal's trace view; the gates' teardown sweeps owned PIDs, not `docker ps`; CI drops Docker | Gate M0 | build | with no `docker` on `PATH`, `nx run-many -t test`, `nx run e2e:layer1` and `nx run e2e:layer2` pass on macOS and in CI, and each run ends with no process of ours left | M |
| M1.35 | One visibility rule ([`decisions/K12-coverage-gaps.md`](decisions/K12-coverage-gaps.md) section 1, ledger `OPS-01`): a `visibility` module in `language-effect` with one `Audience` (`principal` with the roles held, `agent`, `telemetry`, `public`, `owner`) and `sees`, `redact` and `schema`, failing closed; HTTP answers and refusals, the SDK, the CLI, MCP, spans, the journal, logs and the portal's data file all call it; MCP's `shown.ts` becomes the agent case and `Errors.shown` goes | M1.11 | build | a generated check renders every output for every audience over a fixture thing whose answer and refusal carry a public, a private and a secret field: no secret leaves through any output, a private field reaches only a principal holding its role, and a field the declaration doesn't name never leaves | M |
| M1.36 ∥ | Telemetry carries the model ([`decisions/K12-coverage-gaps.md`](decisions/K12-coverage-gaps.md) section 2): `move.from`, `event.name` on the commit span, `refusal.code`, an `ortho.budget.breaches` counter against the declared `budget.p95`, and `environment` and `store` on every call | M1.21 | build | the local world test reads each from the Collector for one call of acme's that moves, emits and is refused, and for one slowed past its budget | S |
| M1.38 ∥ | Confirmation per chain and environment (K7 F2, [`decisions/K12-coverage-gaps.md`](decisions/K12-coverage-gaps.md) section 4): the wallet takes `confirmed`'s depth from the environment's chain, depth one only for a local chain; `flow.ts:29`'s `depth: 1` goes | M1.29 | build | a world declaring depth three on Anvil sees a send `submitted` until three blocks are mined, then `confirmed`; the local environment still confirms at one | S |
| M1.39 ∥ | The canon's chains-and-wallets page ([`decisions/K12-coverage-gaps.md`](decisions/K12-coverage-gaps.md) section 5), by the canon thread: `chain-evm`, `wallets`, the signers and Anvil in a world, from the code; every "waits on K7" or "wait on K7" in `docs/canon/` replaced with what K7 decided; `frame/writing-a-feature.md` matched to M1.29 | M1.29, M1.38 | build | `docs:check` passes with the new page; `git grep -E "waits? on K7" docs design/frame` finds nothing | S |
| M1.40 | The Plugged In app, the canon's one example ([`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)): `examples/plugged-in` at stage 1 without sign-in, written to the canon thread's blueprint and started from Codex's `links/stage-1` (#56), a branch named before K15: `profile` (a handle and its page) and `link`; claim, add, order and remove a link, and a public read of a page; declarations and empty handlers only (ST1.02's journeys come next and fail on them); sign-in comes with ST1.04 and ST1.07 | M1.11 | build | `ortho generate` and `ortho prove --empty` run on `examples/plugged-in`, and it type-checks | S |
| M1.41 | The loop, end to end ([`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)), written by a different agent before M1.42: through the real `ortho` binary in a fresh folder, `examples/plugged-in` is generated and every output is read for the basics: each thing's type and fields with their descriptions and visibility, each operation and read, each machine's states and moves, each event with what it carries, each error with its code, and each step's details in the portal's data; then the server runs locally, every operation is called once through the SDK and once through the CLI, a refused call prints its code, the event and the code reach telemetry, and the portal's data file carries all of it (opening the portal is M1.13's check) | M1.40 | checks | it runs, and fails only where K13's grid says ✗ or ~ | M |
| M1.42 | The basics in every output ([`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)): the SDK exports each thing's type and the events; the CLI's flags typed from each field and its help from the field's description; MCP's input fields described; the portal's data gains field visibility and descriptions, events with their fields, errors with their codes, and step details (`optional`, writes, the call) | M1.41, M1.43, M1.35, M1.36 | build | M1.41 passes | M |
| M1.43 | Plugged In's handlers ([`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)): `examples/plugged-in`' handlers at stage 1, written against M1.41 by a builder who didn't write it: claim a handle (a taken one refused with `HandleTaken`), add, order and remove a link, read a page; one store, no sign-in. ST1.03 later moves the claim into `@orthograph/handles` and ST1.04 adds sign-in. Written from M1.44's scaffold, against what M1.46 hands in, its journeys started from M1.45's stubs (K16) | M1.41, M1.44, M1.45, M1.46 | build | every M1.41 call commits through the SDK and the CLI, and the refused claim prints its code | S |
| M1.44 | The scaffold explains itself ([`decisions/K16-the-scaffold-explains-itself.md`](decisions/K16-the-scaffold-explains-itself.md)): `renderHandlerScaffold(op, path, model)` opens with a doc block citing each part's blueprint file (who may call with the role's rule; payload; answer, each field with its visibility, `(private: only <who> sees it)` or `(secret: no caller sees it)`; each refusal with its fields, exit code and who gives it; idempotency; budget; the thing's machine as a table with this call's rows marked; what the runtime does: the role check, the machine's check, each step's span, the state, the event and where each of its fields comes from, what it hands in (M1.46's `subject`, `refs`, `id`), the spans), its sentences shared with the docs page and `ortho brief`; `Operation` keeps its move's literal type, so `move`'s argument is the `to` union and the handler type exports it as `Outcome`; the body has a section per step in order, a refusal block per declared error with a blank per field before the first writing step (else the last), one `Match.when` per outcome saying which moves can follow, closed by `Match.exhaustive`, and the answer with a note where only it can give an event field; `ortho check` warns, naming the handler, on an outcome it never chooses and a declared error it never names | M1.26 | build | check 19's M1.44 tests and `handlers.test.ts`'s K16 scaffold tests pass, visibility included; check 10 still passes; "the scaffold shows what the runtime hands in" passes once M1.46 is in too | M |
| M1.45 | Journey stubs per machine path, role and declared error ([`decisions/K16-the-scaffold-explains-itself.md`](decisions/K16-the-scaffold-explains-itself.md)): `machinePaths(model, thing)` lists every allowed transition and every refused move (each state not in a move's `from`; none for a creating move); `ortho add journeys <thing>` writes one scaffold per path to `blueprint/journeys/<thing>-<verb>-<path>.ts`, then per operation and read in name order one stub per allowed role no machine stub casts, one refused (a stranger, or no one for signed-in only), and one per declared error, each world, payload and expected field a `Blueprint.todo`, writing only the missing ones; the compiler lists a journey with blanks in `model.blanks` and `prove` skips it, named | M1.44 | build | check 19's M1.45 tests and `handlers.test.ts`'s path and stub tests pass: allowance's sixteen stubs, five byte for byte | M |
| M1.46 | The runtime hands in what it read and refuses what is missing ([`decisions/K16-the-scaffold-explains-itself.md`](decisions/K16-the-scaffold-explains-itself.md), g): the handler's context gains `subject` (the instance the role check and from-check read), `refs.<field>` (each thing a payload field references) and, for a creating move, `id` (minted); a missing one no role check reads is refused before the handler with `<Thing>NotFound { id }`, generated at `<XX>-901`, exit 4, HTTP 404, or the thing's own declared error of that name kept (acme's `AllowanceNotFound`, AL-002); a role-gated miss stays `NotAllowed`; `Handlers.serve` takes `notFound`; every thing has a `notFound` descriptor a journey refuses with, and prove counts it as a runtime refusal; acme's spend and grant stop re-reading and minting by hand | M1.26 | build | `prehandle.test.ts` passes (five, and its control); check 19's M1.46 test passes; acme proves `grant an allowance ✔ 4/4 steps` and `runtime refusals 14/17` (checks 00 and 2, `prove.test.ts`); existing refusal codes unchanged (`model.test.ts`, `versions.test.ts`) | L |
| M1.47 | One refusals table ([`decisions/K16-the-scaffold-explains-itself.md`](decisions/K16-the-scaffold-explains-itself.md), g): generated `api/src/errors.ts` exports `refusals`, `{ code, exit, status }` per refusal, and `exits`, `codes` and each class's status are read from it; the CLI exits with `exit`, HTTP answers `status`, an MCP refusal keeps its text and gains `structured: { refusal, code, exit, status, …shown fields }`; the compiler refuses a declared exit the runtime keeps (0 to 4: success, a failure that isn't a refusal, a bad payload, `NotAllowed`, `<Thing>NotFound`), one outside 5 to 125, or one another refusal of the same thing has (its errors and its machine's `notFrom`; per operation for a borrowed error), naming it: "HandleTaken's exit 3 is NotAllowed's; pick another". Unique per thing, not per app (K16 g) | M1.46 | build | `refusals-table.test.ts` and check 19's M1.47 tests pass, the exit control included; check 08's MCP tests still pass | S |
| M1.48 | The compiler refuses an event it can't fill ([`decisions/K16-the-scaffold-explains-itself.md`](decisions/K16-the-scaffold-explains-itself.md), g): each field of a move's event must be in the thing's fields, the payload or the answer of every operation making the move, or `ortho model` fails naming the event, the field and the operation | M1.26 | build | check 19's M1.48 test passes, and its control (an answer without `remaining` fails `tsc`) still does | S |
| M1.49 ∥ | Monitor, derived ([`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md)): the compiler derives the alert rules (a latency objective per `budget`, a defect objective per operation, an anomaly per refusal code, a verdict per journey and environment) and adds them to the portal's data with their labels; issues keyed by (operation, step, error tag) with first and last seen by the operation's declaration hash; the portal evaluates both over `TraceSource.window` at a fixed `now`; the Issues and Alerts pages and the worst-first list on home, from `@orthograph/portal-ui`; nothing is sent from local | M1.13, M1.20, M1.36 | build | in a local world: 20 calls slowed past `profile.get`'s budget fire its fast burn; one call does not; a planted defect in `link.add`'s `record` step opens one issue and a second joins it; a refusal opens none; the same defect after its operation's declaration changes shows regressed; screenshots are byte-identical at the same `now` | M |
| M1.50 ∥ | One `Graph` in `@orthograph/shell`, on UI SDK (`spikes/react-flow-graphs`, accepted 19 November 2026):<br>• over `@xyflow/react`, pinned at the time;<br>• laid out by `elkjs` in the generator (positions in the portal's data, never in the browser bundle);<br>• our components as nodes.<br>Views from the model: each machine (structure, live counts on moves, a trace from a journey's run), the blueprint map (things in their app or plugin; refs, payload refs, `on:` handlers, mounts, needs), and the worlds' `from` chain with the journeys on each.<br>Replaces M1.13's lifecycle strip. The journey sequence stays. | M1.13, M1.34, M1.42 | build | Plugged In's portal draws its map, both machines and the worlds chain with no position written by hand; two generations give byte-identical layouts; a journey's run lights its path on the machine and no state shows a count; the portal bundle holds no elk | M |
| M1.15 | **Gate M1** | M1.02 to M1.14, M1.16 to M1.21, M1.25 to M1.36, M1.38 to M1.50 | e2e | `nx run e2e:m1` passes on `main`, M1.41 included | S |
| M1.51 | The npm preview ([`decisions/K28-releases.md`](decisions/K28-releases.md)): `publish` may target npmjs for the `@orthograph/*` packages, `orthograph` and the preset, under the `next` tag only, the dry run is prepared by the conductor, and Aaron signs in and runs `npm publish` (direction 12) | M1.15 | build | `npm view orthograph@next` and `npm view @orthograph/cli@next` show the preview, and a fresh folder that installs it from npm proves a copy of `examples/acme` green locally (Plugged In reaches `main` with the beta; `npm create orthograph` is M2.09, the beta) | S |

## M2: Auth and organizations (workable)

**Goal.** Auth stops being copied: identity and tenancy are two mounted plugins, every kind of caller exists, secrets
come from the plugins that need them, and journeys prove the clients people actually use.
**Ships.** `@orthograph/auth` and `@orthograph/organizations` (K2); principals `agent`, `service`, `system` and `Via`;
roles as rules, or declared with `who` and `holds` (K20); secrets by declaration ([`frame/secrets.md`](frame/secrets.md)); `ortho new`;
`ortho new feature` with its own CI.
**Gate: workable.** `nx run e2e:m2`: (1) `npm create orthograph demo` scaffolds an app with auth and organizations
mounted and nothing copied, and `ortho prove --env local` is green; (2) a new `notes` feature is made with
`ortho new feature`, proved in its own world, published to the local registry, and mounted into acme and work with
`ortho add`, with every journey in all three still green; (3) the sign-up and sign-in journeys pass through the SDK,
the CLI and MCP; (4) no environment file names a secret by string; (5) the stage 1 check (K9): the scaffold is
Plugged In at stage 1, a person signs in, claims `aaron` and adds a link in headless Chromium, and a second claim is
refused with `HandleTaken` through the SDK, the CLI, MCP and the page (actions come with M1.22, in stage 1, K29).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M2.01 | The detail of principals and roles: `agent` acting for a person, `service(<mount>)`, `system`; `.via` and `.notVia`; what auth and organizations each own; how acme's copied things move; a plugin's own CI | Gate M1 | decision | `decisions/M2-auth.md` written | S |
| M2.02 | Journeys for both plugins, moved out of acme (sign up and in, an owner makes a key, invite and accept, an invitation used once, an outsider can't revoke) plus new ones: service and system refused where not allowed; an agent passes the owner rule unless `.notVia(Via.agent)` | M2.01 | checks | they fail on empty handlers | M |
| M2.03 | Principals in `roles/types.ts` (today `anonymous \| person`, lines 6 to 8) and the runtime; `issues:` per environment | M2.01 | build | the principal journeys pass in acme | M |
| M2.04 ∥ | Secrets by declaration: `Blueprint.secret`, names from mount and export, `Redacted` through the plugin's layer, `ortho secrets` and `secrets set` locally | M2.01 | build | acme's environments name no secret; prove passes | M |
| M2.05 | `@orthograph/auth`, identity: person, session, api-key; Better Auth behind its worker entry; `AUTH_SECRET` declared | M2.03, M2.04 | build | the identity journeys pass with acme mounting it | L |
| M2.06 | `@orthograph/auth`, ways in: the device flow, OAuth for MCP, the builder's sign-in to the portal (K5 seam 9), choices (`signIn`, `keys`), settings (`sessionLength`, `allowedOrigins`) | M2.05 | build | `acme login` and MCP sign-in journeys pass | M |
| M2.07 | `@orthograph/organizations`: organisation, membership, invitation, owner and member as `holds` roles (K20), starting worlds `founded` and `invited`; acme's copies deleted | M2.05, M2.18 | build | the tenancy journeys pass from the plugin; acme has no `organization/` folder | M |
| M2.08 ∥ | Journeys through the clients: a world runs steps through the SDK, with `--through cli\|mcp` (actions join with M1.22, in stage 1, K29) (`journeys/internal/world.ts:85` calls HTTP directly today) | M2.05 | build | the auth journeys pass all three ways | M |
| M2.09 | `ortho new` replaces the Nx preset: the app it scaffolds is Plugged In at stage 1 (K9), with auth and handles mounted; `examples/starter` becomes that template | M2.07, ST1.07 | build | `npm create orthograph demo` from Verdaccio, then `ortho prove --env local` is green; the template's `blueprint/` and `src/` are identical to `examples/plugged-in`'s on the same commit; once `plugged-in/stage-1` is tagged (M2.12), the check compares against the tag | M |
| M2.10 | `ortho new feature`, a plugin's own world and CI, `ortho publish --local` for plugins | M2.07 | build | the `notes` feature goes from new to proved to published to mounted | M |
| M2.11 ∥ | The work app mounts auth and organizations | M2.07 | build | `ortho prove --root examples/work` passes with no copied identity | S |
| M2.13 ∥ | SIWE linking in the wallet plugin (was M6.04, L3.03): `challenge`, `complete`, `link`, `unlink`, `list`; agents never link (`notVia(Agent)`) | M2.05, M1.29 | build | `acme wallet link`, then `acme session show` lists the address; an agent's link is refused | M |
| M2.14 | `ortho add` on Nx's `Tree` ([`decisions/K12-coverage-gaps.md`](decisions/K12-coverage-gaps.md) section 7; the spec's "scaffolding uses Nx generators where they fit"): `Add.plan` stays pure and typed, its files written once through an `FsTree` in the entry file, `--dry-run` from `tree.listChanges()`, `AddRefused` mapped at the edge | Gate M1 | build | the `add` tests pass unchanged; `ortho add thing` writes the same files as before, byte for byte; a planned write that fails leaves nothing written | S |
| M2.15 | The kinds that edit in place: `ortho add event`, `error`, `role`, `move`, editing the thing's existing files; `add thing` composes them | M2.14 | build | `ortho add move allowance.close` adds the move to `machine.ts` and its event to `events.ts`, and `ortho prove --empty` shows the new move red; adding one twice is refused | M |
| M2.16 | Migrations: `@orthograph/*` ship `migrations.json`, and `nx migrate` upgrades a blueprint across a breaking change, before the first stable release | M2.14 | build | a fixture blueprint written against the previous API is migrated by `nx migrate` and proves green | S |
| M2.17 | Checks for declared roles ([`decisions/K20-roles-across-things.md`](decisions/K20-roles-across-things.md)), written by a different agent from M2.18's builder: a `who` role allows the person its field names; a `holds` role allows a caller holding a matching row (its `where` values, its `while` states) and refuses one who doesn't, through `.of(...)` as well; removing the row refuses the next call; the compiler refuses a `holds` field that doesn't point at the role's thing, a `who` field that holds no person's id or email, and a `where` key the row lacks; the docs and MCP say who may call in words; the store has the role's index | Gate M1 | checks | they fail on today's `Blueprint.role` for the right reason | S |
| M2.18 | `who` and `holds` beside `rule` in `orthograph`'s `roles`; the model's role kind; `language-effect`'s access check making one lookup (a new `Records.any`) and `prove` using the same check; the store's index per `holds` in the first migration; docs, portal and MCP text from the declared form | M2.17, M2.03 | build | M2.17's checks pass; acme's and Plugged In's rule roles behave as before | M |
| M2.19 ∥ | Checks for adopting a mounted thing ([`decisions/K22-a-mount-names-its-things.md`](decisions/K22-a-mount-names-its-things.md)), written by a different agent from M2.20's builder: a fixture app mounts `@fixture/echo` and adopts its thing under its own folder name; every output (model, API paths, SDK, CLI, MCP, docs, portal, span names) names it by the app's word; the plugin's events, errors and fields that start with or are the thing's name follow it; the model's `from` names the plugin's thing; a clash with the app's own name is a `check` error naming both files | Gate M1 | checks | they fail on today's compiler for the right reason (the adopted folder is refused or ignored), and pass on a hand-built fixture of the expected model | S |
| M2.20 ∥ | `Blueprint.adopt(mount, thing)` in `orthograph`; the compiler's layout reads a thing folder whose `thing.ts` adopts a mounted thing, and `mounts/internal/fold.ts` gives it the folder's name and applies the follow rule; the generators need nothing beyond the model's names | M2.19 | build | M2.19's checks pass; Plugged In's tests stay green; nothing in the fixture app writes the adopted name as a string | M |
| M2.12 | **Gate M2: workable**, and the stage 1 gate (K9) | M2.02 to M2.11, M2.13 to M2.20, M1.22, M1.23, ST1.02 to ST1.04, ST1.06 to ST1.08, ST1.25 to ST1.28 | e2e | `nx run e2e:m2` passes on `main`; `examples/plugged-in` is tagged `plugged-in/stage-1` | S |

## M3: The factory, with people as workers

**Goal.** `@orthograph/work` holds a board of work items ([`decisions/K11-work-board.md`](decisions/K11-work-board.md)):
the manager plans a goal onto it from Aaron's words, a spec, a failing check, the ledger or the model's gaps; dispatch
runs ready items in parallel without two touching the same files; people and outside agents (Claude Code through the
work CLI or MCP) work them. Only a fact closes an item.
**Spikes before it** (K11, any time, off every gate): `spikes/dispatch-sim` (the dispatch rules on a synthetic plan) and
`spikes/work-board` (the board over `examples/work`'s generated API, one real goal: Plugged In stage 1).
**Ships.** The factory plugin ([`frame/examples/factory.md`](frame/examples/factory.md)); declared workflows on Effect's
Cloudflare engine; the logbook adapter; the generated agent kit ([`frame/generators.md`](frame/generators.md));
`ortho ci`. And, moved here by K13 with their ids: the shell's chat and screen
context (M1.24), MCP from the whole model (M1.37), the portal's faces and notes (M3.21), and the SDK, CLI and MCP as
mounted plugins (M3.22). Actions and approvals (M1.22, M1.23) moved on into stage 1 (K29).
**Gate.** `nx run e2e:m3`: a goal "allowances to production" over acme is planned onto the board, the model's gaps
among its items; a person claims `build:allowance.revoke` with `work item claim`, pushes a branch, the local CI proves
it and the verdict closes the item; closing an item by hand is refused; dispatch never runs two items that touch the
same path; evicting the manager's Durable Object mid-loop dispatches nothing
twice; `generated/agents/` passes its drift check.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M3.01 | `Blueprint.workflow`: its shape (activities, `await` on an event, durable clocks, each wait through `Timers` so a stepped world moves it, K23), where it lives, and the Effect and platform-cloudflare pins. Starts from K5 seam 6: an activity is keyed by run id and activity name; the workshop's publish is the example; settles wake-up, deduplication and replay, and settles where `emits:` on an operation with no machine sits beside workflows (K5 Q5, Aaron: "B, on the operation"; built in M3.16) | none (K34) | decision | `decisions/M3-workflows.md` written | S |
| M3.02 ✅ | `effect` 4.1.1 to 4.1.3 everywhere, as its own slice | M3.01 | build | every existing gate still green | M |
| M3.03 ✅ | `CloudflareWorkflowEngine` under local workerd: does a replay after eviction skip finished activities? | M3.02 | spike | `spikes/effect-workflow-workerd/README.md` answers it with a run | S |
| M3.04 | Journeys for the factory (W1) in K11's shape ([`decisions/K11-work-board.md`](decisions/K11-work-board.md)): goal, item, claim, board, question, attention; "only a fact closes", claims and leases, touches never shared while running, attention | M3.01 | checks | they fail on empty handlers | M |
| M3.05 | `@orthograph/work` as a feature: the work blueprint moves into a package, mounted by `examples/work`; choice `workers: people` (agents comes in M4) | M3.04 | build | the work app proves with the plugin mounted | M |
| M3.06 | Its handlers (W2) | M3.05 | build | all but the model-gaps source's journeys pass | M |
| M3.07 | The logbook adapter, hand-written (S18): `facts.list` and the models per revision | M3.06 | build | a factory read returns acme's verdicts from a local logbook | S |
| M3.08 | Events in through `on:`, first for one adapter: `logbook.events.verdictRecorded` takes `item.close` or `item.return` and wakes `goal.notice`, as `service(logbook)` | M3.07, M3.20 | build | a posted verdict closes its item once, even when posted twice | M |
| M3.09 | The model's gaps as a source (W3, K11): kinds `write:journey`, `build`, `fix`, `improve`, worked out from the model and the facts, filed as items by `goal.plan`, never the board itself | M3.07 | build | a goal over acme gets the tasks `factory.md` lists filed as items, each in the column its facts give | M |
| M3.10 | The manager as a declared workflow, one per goal (K11; F5's mission), waiting on durable deferreds and a daily clock (absorbs L5.04 for the factory) | M3.03, M3.08, M3.09 | build | killing its Durable Object mid-loop starts nothing twice | M |
| M3.11 | Claims for people and outside agents: `work item claim` writes the brief and a branch, over the CLI and MCP | M3.09 | build | a scripted claim, push and CI run closes the item by its verdict | M |
| M3.12 ∥ | **Parked** with the skills design (PR #37; K5). The `agents` projection, built on `builder`: skills, role definitions and rules under `generated/agents/`, neutral, Claude Code and Pi forms, the Markdown header (S8, S10 to S13) | M3.05 | build | a model change rewrites the kit; a hand edit fails the drift check | L |
| M3.13 ∥ | `ortho ci <stage>` and the short scaffolded workflow (S9) | M3.11 | build | `ortho new` projects run test worlds and verdicts through it | M |
| M3.14 ∥ | **Replaced by M3.17** (K11: the board is an extension of the one portal, not a separate surface). Was: the portal's Work side: board, KPIs, attention | M3.09 | build | the board in the portal matches `work board items` | M |
| M3.16 ∥ | `emits:` on an operation with no machine (K5 Q5): the event committed with the call's writes, only on success, and only when the call wrote | M3.01 | build | journeys assert `DraftEdited` present after a successful edit, absent after `DraftChanged`, and absent after an unchanged edit | S |
| M3.17 ∥ | The board extension (K11): a `Board` in `@orthograph/shell`, on UI SDK (HeroUI leaves in ST1.27) with our own server-owned hook (`spikes/kanban-components`), the machine refusing illegal drops on the client, typed refusals on the card, the inbox column, one lane per goal with "needs you" pinned, live updates (FAC-08) held still while a card is held, a person's drops limited to backlog, ready and done | M3.06, M3.20, M1.13, M3.21, M1.25, M1.34 | build | the board in the portal matches `work board items`; an agent's move to `done` is refused `OnlyAFactCloses`; Aaron's drag to `done` writes an `accepted` verdict; the board runs in its sandboxed frame (F8): a drop reaches its move's action through the bridge, and a held card holds the bridged live feed | M |
| M3.18 | Dispatch (K11): one workflow per board; ready set, touches never shared while running, critical path first, slots, a person worker's claim with a lease (an agent's, ending with its run, comes with M4.13), three retries then `block`, touches from `factory.brief.of` for model gaps, the role from `factory.roster.for(kind)`, a review pass for every item in `review` | M3.10, M3.11 | build | a plan of 12 items over acme with 3 overlapping touches runs with `workers: people` scripted; no two running items share a path; evicting dispatch mid-pass claims nothing twice | M |
| M3.19 | The inbox and the manager (K11): signals received into `inbox` (failing checks, ledger rows, model gaps; GitHub issues come with M5.14 over M4.25's adapter; an authority's words filed directly), triage under agreed goals, finite and standing goals agreed once, `goal.plan` with milestones in one commit, acyclic needs, overlap warnings | M3.09, M3.10 | build | a failing check over acme lands in the inbox; a scripted manager (a Claude Code session or a fixture calling the CLI) accepts it under the agreed goal and its items run; an unrelated signal it opens as a goal waits on attention (the manager as an agent, triaging unasked, is M4.13) | M |
| M3.20 ∥ | `review` and `accepted` as logbook verdict kinds (K10, K11 seam 3 and Q2): `review` keyed by revision, posted by a signed-in person or by a reviewer agent's run, the same kind either way; `accepted`, an authority closing an item in person, never through an agent; promote and an item's done-when can name either | M3.07 | build | a person's `review` pass and an agent's `review` fail on one revision are both read back by `facts.list`; a review posted for another revision doesn't count; an `accepted` posted by an agent acting for Aaron is refused | S |
| M3.21 | Faces and notes (was part of M1.13, [`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)): the face contract (`Portal.face` at a feature's `./portal` subpath, its typed slots, `Portal.view.board`) and the `orthograph/face-actions-only` lint rule; every face in a sandboxed frame calling only its declared actions; from Codex's portal (F8), notes as Markdown pinned to `kind:name@hash` in the `note` thing, edited against a revision | M1.13, M1.23 | build | a fixture feature's face renders a `views.list` board, and a face that imports a store or calls `fetch` fails the lint; a face that calls `fetch` at run time is blocked, and one that calls an action it did not declare is refused by the bridge; a framed face, with its opaque origin, loads `@orthograph/shell` from the portal's built assets under its `script-src`; a `note.edit` at a stale revision is refused `NoteChanged`; a note whose declaration's hash moved shows stale | M |
| M3.22 | The clients as mounted plugins (was M1.12's other half, [`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md)): sdk, cli and mcp move from `generators` into `@orthograph/projections`, mounted like api and server; tool exposure from `allowed` and `via` | M1.12 | build | acme's generated clients unchanged byte for byte except header paths | M |
| M3.23 ∥ | Custom dashboards ([`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md)): `Dashboard.make` and `Panel.latency`, `Panel.refusals`, `Panel.rate` and `Panel.calls` in `orthograph`, taking declarations; files in `blueprint/dashboards/` show under Monitor › Dashboards with one time control and the environment as a variable | M1.49, M3.21 | build | Plugged In's `public-page` dashboard renders; deleting the operation one of its panels names fails `ortho check` with the panel's file and line | S |
| M1.24 ∥ | The port, part two: the shell's chat and "Needs you" (its frame, the tree, top bar, live rail and drawer, came with M1.13) and screen context (the page, the window, the open trace, and what a face's `context` adds), as [`portal.md`](portal.md) draws them; the approval card's contract from M1.23; the shell and the chat parts come from `@orthograph/shell` (K31). The chat's surface is M4.16 (`@orthograph/shell`'s chat parts, on UI SDK by K29, over a Pi Durable run), and conversations are `@orthograph/agents` Runs, not things in the portal's store (M1.25). Signed in through acme's own auth until M2.06; `view-screen` and `navigate { tab, to }`, with screen context held per tab, and the portal's `AGENTS.md` generated from the model, saying to read the screen first (F8) | M1.13, M1.17, M1.23, M1.34 | build | the shell and screen context run on acme's Worker over D1; no `@agent-native/*` package is installed; an agent's `view-screen` on one tab returns that tab's page and open trace, and `navigate` on it leaves another tab where it was; the generated `AGENTS.md` opens with its `Generated from …` line and tells an agent to call `view-screen` first | M |
| M1.37 | MCP from the whole model ([`decisions/K12-coverage-gaps.md`](decisions/K12-coverage-gaps.md) section 3): `destructiveHint`, `idempotentHint` and `title` from the declaration, an `outputSchema` from the answer, refusals as structured errors carrying their code, resources for things and the docs, approvals through M1.23's rule, all through M1.35's agent audience | M1.12, M1.23, M1.35 | build | an MCP client lists acme's tools with their hints and output schemas, reads a thing as a resource, gets `AL-001` as a structured error, and a call that needs approval waits for one | M |
| ST1.05 ∥ | The host's caller for actions (K9, agent-native finding 4): a host key that acts as `agent for <person>`, named by email, for actions hosted outside our portal | M2.03, M1.22 | build | an agent-native-shaped host claims a handle for ada and the Worker's span says `agent for ada`; a `.notVia(Via.agent)` operation is refused | S |
| M3.24 | Checks for a repeat that changes nothing ([`decisions/K21-a-repeat-changes-nothing.md`](decisions/K21-a-repeat-changes-nothing.md)), written by a different agent from M3.25 and M3.26's builders: a move's `unchanged` state answers, writes nothing and journals nothing, and a handler that writes in it dies; `idempotent: { by }` replays the first answer for the same caller and fields, refuses a changed payload `IdempotencyConflict`, and lets another caller meet the thing's own rules; MCP's `idempotentHint` (M1.37) and the docs say both | Gate M2, M1.37 | checks | they fail on empty handlers and on today's runtime for the right reason | S |
| M3.25 | `unchanged` on a move: `MoveSpec` in `orthograph`, the model, `checkFrom` letting the state through, the commit dying on any write or move, the span's `move.unchanged`, the machine diagram's loop, coverage asking for each unchanged state once | M3.24 | build | M3.24's `unchanged` checks pass; every existing machine's journeys stay green | M |
| M3.26 | `idempotent: { by: [<payload key>] }`: the request key made from the operation, the caller and the canonical `by` fields (`handler/service.ts:152-155` today), the compiler refusing an empty `by` or one combined with `"request"`, MCP's `idempotentHint` and tools' `replay: "safe"` for it too | M3.24, M1.37 | build | M3.24's intent checks pass; `idempotent: "request"` behaves as before | S |
| M3.27 | Journeys and checks for workflows (K35): a job with activities resumes after its Durable Object is evicted with each finished activity run once; it wakes on an event, a second delivery waking nothing; it wakes on a durable clock in a stepped world, every wait through `Timers` (K23); each activity carries its request key (the M3.03 spike's two conditions) | M3.01 | checks | they fail on empty handlers, and `nx run e2e:workflows` lists them | S |
| M3.28 | `Blueprint.workflow` built (K35): `@orthograph/workflows` on `CloudflareWorkflowEngine`, its host module in `host-cloudflare`, and `examples/workflows` | M3.27, M8.07 | build | `nx run e2e:workflows` passes | M |
| M3.15 | **Gate M3** | M3.02 to M3.11, M3.13, M3.16 to M3.28, M1.24, M1.37, ST1.05 | e2e | `nx run e2e:m3` passes on `main` | S |

## M4: Agents, proved with the factory

**Goal.** `@orthograph/agents` runs agents durably, usable alone or as the factory's workers, joined by one optional need.
**Ships.** The agents feature ([`frame/examples/agents.md`](frame/examples/agents.md)); model adapters with a local
stand-in model; `Blueprint.agent`; the builder's code-mode tools and telemetry tools ([`frame/builder.md`](frame/builder.md));
the join, `workers: agents`.
**Gate.** `nx run e2e:m4`: (1) acme's support agent spends from Bob's allowance as an agent for Bob, and is refused on
an operation marked `.notVia(Via.agent)`; (2) evicting a run's Durable Object mid-turn resumes it with no second model
call; (3) a mission over acme with `workers: agents` runs: the manager starts builder runs from briefs, a builder using
only the generated kit and `bp` fills `allowance.revoke`, the verdict closes the task, and the promote waits for a
person; (4) the run's trace is read back through `bp.telemetry`; (5) an experiment started from the portal is
discarded leaving no workspace, world or branch, and a kept one lands as its package plus one mount file, only after
its prove and review verdicts. CI uses the local stand-in model (S14).
**Spikes before the factory slices** (K10, any time, off every gate): `spikes/workspace-e2b` (our E2B template; `ortho
check` and `prove` inside it, with M1.33's process forms and no Docker; start-up and an hour's cost against the $5 sandbox share; a preview world's port reaching
the portal) and `spikes/experiment-loop` (start, discard and keep by hand on the local copy, with Claude Code as the
agent: how long a start takes, and whether anything is left).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M4.01 | H1 and H2 under the frame: the Run thing, where Pi runs (a Durable Object per run, Node for the bench), the local model server and model, pinned | none (K34) | decision | `decisions/M4-agents.md` written | S |
| M4.02 | Journeys for the agents feature, prose then steps | M4.01 | checks | they fail on empty handlers | M |
| M4.03 | The floor (A0): the run record and folder, the trusted scorer, check 4 as the first runner | M4.01 | build | check 4 runs through the runner and writes a scored record | M |
| M4.04 | The Pi Durable seam on Node SQLite (A1) | M4.03 | build | a run survives a process kill and resumes its transcript | M |
| M4.05 ∥ | Model adapters: `@orthograph/anthropic` and an OpenAI-compatible adapter; keys as declared secrets (A2) | M4.04 | build | the same task runs on both behind one interface | M |
| M4.06 ∥ | The local stand-in model, `Stand.process` (S14) | M4.05 | build | journeys run against it with no key | M |
| M4.07 ∥ | Tools and skills: `toolsOf(operations)`, shared with MCP and the actions projection, called as `agent for` the run's starter: the one mechanism behind both the chat's tools and the building agents' (K10 section 1); project tools with denied paths; `SKILL.md` folders (A3) | M4.04 | build | an operator agent's tool call is checked by the real server's roles | M |
| M4.08 ∥ | Run telemetry through the Collector (A4) | M4.04 | build | a run's trace is read back by its id | S |
| M4.09 | The Durable Object host: one per run, alarms, Pi's closure measured for workerd (A6) | M4.04 | build | evicting mid-turn resumes with no duplicate model call | L |
| M4.10 | `@orthograph/agents`: Run, its machine, start, steer, cancel, the system's moves, `Blueprint.agent`; `Agent` as a thing read from the declarations; `run.start` taking `key`, the caller's request key; `runFinished.outcome` closed (`pushed`, `reviewed`, `answered`, `blocked`) and `runFailed.reason` closed with `transient` (K10 section 5); `RunPoolFull` | M4.02, M4.09 | build | the agents journeys pass, mounted in acme | M |
| M4.11 | The builder's typed API and code mode: `generated/builder/bp.d.ts`, the sandbox, the direct tools | M4.10 | build | a builder script lists blanks and runs one journey through `bp` | L |
| M4.12 ∥ | `bp.telemetry` over `TraceSource`: trace, calls, refusals, defects, slow | M4.11 | build | a script finds the slowest step of a run | M |
| M4.13 | The join: `workers: agents`, `Blueprint.need(agents, { when })`, dispatch through `agents.run.start` keyed by the claim, `runFinished` (with the changed paths) and `runFailed` back through `on:`; the kind-to-role map from the factory's roster (K11, the seam with K10) | M4.10, M4.11 | build | an item dispatched to an agents run closes by its verdict; the manager as an agent accepts a failing check under its goal with no one asked | M |
| M4.14 ∥ | The `pi` runner in the bench (A5) and suites, spend and the report (A8), off the gate | M4.04 | build | `bench` writes one suite's report | M |
| M4.16 | The portal's chat on a durable agent (K5): one `@orthograph/agents` run per thread, the actions as its tools, approvals through the chat; any listed agent addressable (`chat.addressees`); rendered with `@orthograph/shell`'s `Chat` parts, on UI SDK (K29, K31), `ChatTool` states from the action's (K10 section 6) | M4.10, M1.24, M1.34 | build | evicting a chat's run mid-turn resumes it with no second model call; a refused action shows its typed refusal in the thread | M |
| M4.17 | Journeys for workspaces and experiments (K10), by an author who is not the builder: open, fenced writes, check, prove, push, close; experiment start, keep and discard; keep refused without prove and review verdicts; nothing left after discard | Gate M2, M3.20 | checks | they fail on empty handlers | M |
| M4.18 | `@orthograph/workspaces` on `@orthograph/sandbox`'s `local` choice (K10 section 3; K39: the sandbox holds the machine, the workspace adds `ortho`): `Workspace` and its machine, `ortho` as its operations (`brief`, `read`, `write`, `check`, `prove`, `add`, `generate`, `diff`, `push`, `close`), writes fenced by `realpath` and case-insensitive paths, `push` through the `github` adapter (its stand-in a bare local repository), `WorkspacePoolFull` | M4.17, M4.25, Goal 17's slice 5 (the sandbox) | build | a Claude Code session over MCP opens a workspace over acme, writes `allowance.revoke`, `check` and `prove` pass inside it, and `push` opens a pull request on the stand-in; a write outside the allowed paths is refused; `close` leaves nothing | M |
| M4.19 ∥ | The sandbox's `e2b` choice (`@orthograph/sandbox`, K39), for workspaces: our template, long commands in the background checked on an alarm, a sweep by tag, sandbox spend under its share ($5 a day by default) | M4.18, `spikes/workspace-e2b` | build | M4.18's journeys pass on E2B with Aaron's existing key; evicting the run's Durable Object mid-`prove` resumes and reads the result; 0 sandboxes are left after | M |
| M4.20 | `@orthograph/factory`'s floor (K10 section 4): `Experiment` (`started → kept \| discarded`), the spike lane, `factory.brief.of`, `factory.roster` as data; usable by people and Claude Code before any Pi agent | M4.18, M3.20, `spikes/experiment-loop` | build | start then discard leaves 0 workspaces, worlds and branches; keep without prove and review verdicts is refused; keep's pull request changes only the package folder and one mount file; `brief.of` gives the same `write` paths as `ortho brief` | M |
| M4.21 | The `builder` and `reviewer` agents, the reviewer writing the `review` verdict (M3.20) (K10 section 2) | M4.10, M4.13, M4.20, M3.20 | build | an item dispatched with `workers: agents` runs the builder in a workspace and ends `pushed` with its changed paths; the reviewer ends `reviewed` and writes a `review` verdict; the builder's write outside its brief is refused; all on the stand-in model | M |
| M4.22 ∥ | The rest of the roster: `designer`, `author`, `spike`, `planner`, one file each, each addressable from the chat | M4.21, M4.16 | build | each agent, addressed from a chat thread, ends with its declared outcome on the stand-in model; the author's journeys fail on empty handlers | M |
| M4.23 ∥ | The Factory face (K10 section 6): `Portal.face` with the Factory sidebar group, the roster, the runs list, the live run and the workspace, composed from `@orthograph/shell`'s exports (K31); no agent UI code in the canon; the face's export name and lint as M1.25 settles them | M1.13, M3.21, M1.25, M4.16, M4.20, M1.34 | build | the four views render acme's runs and workspaces; a refused action shows `output-error` with its code and never a raw defect; an approval shows `requires-action` and runs once on approve; the face holds no store handle or `fetch` (by M1.25's lint, if it adopts one); the face runs in its sandboxed frame (F8): a Run's stream reaches it through the bridge, and approve calls a declared action | M |
| M4.24 | Promotion by verdicts (K10 section 3): promote also requires the revision's `review` verdict; a revision on `main` with its prove and review verdicts goes to staging with nobody asked; production is an attention only a person approves | M3.13, M3.20, M4.21 | build | a proved and reviewed revision reaches the local staging world unasked; the production promote waits on an attention that an agent acting for Aaron is refused | S |
| M4.25 | The `github` adapter, `@orthograph/github`, built by Goal 17 (K39; K10 section 3): a GitHub App; calls generated from GitHub's OpenAPI document, `branches.push`, `pulls.create`, `issues.comments.create`, `pulls.reviews.reply` and `reactions.create`; signed webhook events `issueComment`, `issues`, `pullRequest` (its merged close among them), `pullRequestReview`, `pullRequestReviewComment` and `checkRun`; secrets declared by the adapter; its stand-in a bare local repository with a small pull-request record (second rung: Gitea) | Gate M2 | build | the adapter's conformance passes against the stand-in; a pushed branch and its opened pull request read back; a merge emits `pullRequest` closed and merged once; a webhook with a bad signature is refused | M |
| M4.26 ∥ | Agent waits on the world's clock (was L5.08, K23): the agent's `Timers` is the world's, so a stepped or scaled clock moves a run's backoff and sleeps | M4.09, M8.07 | build | a journey moves the clock past a run's retry backoff in seconds and the run resumes on time; nothing in the agents package waits any other way | S |
| M4.15 | **Gate M4** | M4.02 to M4.13, M4.16 to M4.26 | e2e | `nx run e2e:m4` passes on `main` | S |

## M5: Reach out

**Goal.** Adapters both ways with real vendors' software, our own events driving work, and lists across homes.
**Ships.** [`frame/examples/payments.md`](frame/examples/payments.md) and
[`frame/examples/notifications.md`](frame/examples/notifications.md); `@orthograph/stripe`, `@orthograph/resend`; views
(K2 Q1); the general outbox; declared workflows in apps.
**Gate.** `nx run e2e:m5`: checkout runs against stripe-mock, labelled vendor; a world-sent signed event settles a
payment as `service(stripe)` (S19); a refund is refused through an agent (S20); an invitation's email arrives once in
Mailpit even when the actor is killed mid-send; a view lists an organisation's allowances while allowances live as
actors; `ortho prove` names each adapter's stand-in.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M5.01 | Views (where a view lives, how it is rebuilt), the general outbox (S22, S24), `step.await` on adapter events | none (K34) | decision | `decisions/M5-reach-out.md` written | S |
| M5.02 | Journeys for payments and notifications | M5.01 | checks | they fail on empty handlers | M |
| M5.03 | Events in, general: doors that verify signatures, `on:` for adapter events and our own as `system`, idempotency by event id | M5.01 | build | a webhook sent twice settles once | M |
| M5.04 | The outbox for every move: events written with the state, delivered at least once; an undeliverable one is a defect with a redelivery command | M5.03 | build | killing a delivery mid-way delivers once after restart | M |
| M5.05 | Views at runtime: `Blueprint.view`, kept from events, reads generated in the SDK, CLI and MCP | M5.04 | build | the allowances view lists actor-homed allowances | L |
| M5.06 ∥ | The data map and the portal's data page | M5.05 | build | `generated/data/map.md` and the page list every store (kind, binding, migrations), every source (adapter, calls, stand-in) and every view | S |
| M5.07 | `ortho new adapter --from-openapi` and the conformance harness | M5.03 | build | a generated adapter's calls pass against its stand-in | M |
| M5.08 | `@orthograph/stripe`: stripe-mock stand-in, `provision`, money calls `.notVia(Via.agent)` by default (S20, S21) | M5.07 | build | the payments journeys pass | M |
| M5.09 ∥ | `@orthograph/resend` over SMTP, Mailpit as the stand-in (S23) | M5.07 | build | the notification journeys read the inbox | S |
| M5.10 | Declared workflows in apps: notifications, and `invitation.send` once across a kill (absorbs L5.04) | M5.04 | build | one email, not two, after a mid-send kill | M |
| M5.13 ∥ | A source we don't own (K3 items 8 and 9): first a spike on reaching MariaDB from workerd (TCP sockets or Hyperdrive, with a Node host as the fallback), then a fixture adapter over a MariaDB database it doesn't migrate, its stand-in real MariaDB loaded from a schema dump, conformance against it, and events from it kept in a view | M5.07 | spike, build | a handler reads a candidate through `step.call` with its own span; the conformance test fails when the dump's schema changes; Orthograph writes no migration for it | M |
| M5.11 ∥ | Another Orthograph app as an adapter, `--from-model`, its stand-in a world of that app | M5.07 | build | acme calls a second fixture app through a generated adapter | M |
| M5.14 ∥ | Signals from GitHub issues (M4.25's github adapter, not a second one), Slack and alerts into the work inbox (K11): their adapters' events received through `on:` | M5.03, M3.19, M4.25 | build | a GitHub issue, a Slack message and a fired alert each land once in the inbox; an alert on a standing goal's measure is accepted under it | M |
| M5.15 ∥ | Declared state limits ([`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md) Q3): `within` on a machine state; entering it starts a `Timers` wait for that thing; leaving cancels it; overstaying raises `<thing>.overstayed` once, which becomes an alert rule with no counting | M5.14, M8.07 | build | a fixture link held in `listed` past a 1 min `within` raises one `link.overstayed` and one alert; one that moves on in time raises nothing; the portal shows no count of links in any state | S |
| M5.12 | **Gate M5** | M5.02 to M5.11, M5.13 to M5.15 | e2e | `nx run e2e:m5` passes on `main` | S |

## M6: On chain

**Goal.** The allowance can live on chain, written once and generated in two languages. Where each key lives is declared, on a device
or on a server (Aaron, 18 November 2026, K7).
**Ships.** `@orthograph/language-solidity`, the relayer and follower, one vault per organisation (S27);
[`frame/examples/allowance-on-chain.md`](frame/examples/allowance-on-chain.md).
**Gate.** `nx run e2e:m6` (old Gates 3 and 4 together; the wallet, the chain adapter and Anvil in worlds landed in M1 and M2):
`forge test` passes on the filled vault; the fixed-seed fuzz of the TypeScript machine against the Solidity one finds
no divergence (S26); journeys pass on Anvil with each person signing; 100 relayed submissions take nonces 0 to 99; a
forced reorg is corrected; a pending chain call shows its in-between state (S25); the key-hygiene check passes.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M6.01 | Starts from [`decisions/K7-chain-languages.md`](decisions/K7-chain-languages.md), which settles the operation-to-chain mapping, client exposure, refusals, the submission lifecycle and `confirmed`. What is left: D5 (values across languages, `signedBy` as EIP-712, one vault per organisation) and the exact schema of `surface.json` and `refusals.lock` | none (K26, K34) | decision | `decisions/M6-chain.md` written | S |
| M6.02 | Journeys for the chain: contracts, the relayer and the follower (Codex's planned files `06` to `08`; the wallet's are M1.28 and M2.13) | M6.01 | checks | they fail on empty handlers | M |
| M6.03 | Moved to M1.29 (K7 F4: the wallet is the first plugin) | | | | |
| M6.04 | Moved to M2.13 (K7 F4: the wallet is the first plugin) | | | | |
| M6.05 | Moved to M1.30 (K7 F4: the wallet is the first plugin) | | | | |
| M6.06 | Moved to M1.31 (K7 F4: the wallet is the first plugin) | | | | |
| M6.07 | The relayer actor (L3.06) | M1.31 | build | 100 concurrent submissions, nonces 0 to 99, a dropped one replaced | M |
| M6.08 | Moved to M1.32 (K7 F4: the wallet is the first plugin) | | | | |
| M6.09 | The chain follower (L3.08), which also feeds the portal's committed chain events (K5 seam 10); its checkpoint is a block number plus a window of block hashes, and a take-back emits `<Event>Corrected { wasConfirmed }` (K7 Q6) | M6.07 | build | an `anvil_reorg` that replays a different digest emits a correction and then the new event; a restart doesn't double count | M |
| M6.10 | Values with Solidity types and `lives: Blueprint.chain.evm(...)` (`chain` as a family of store kinds, K7 Q4); the compiler accepts `runs: "chain"` (L4.01; `describe.ts:108` refuses it today); `blueprint/refusals.lock` for every language, so codes no longer come from declaration order (`describe.ts:79`; K7 Q5) | M6.01 | build | `ortho check` reports the change as major; swapping two declared errors keeps both codes; renaming a published code is refused | M |
| M6.11 | `language-solidity`, no longer a placeholder: types, the compiled machine, roles and refusals compiled in (one custom error per declared error), the ABI, roles generated in (OpenZeppelin-style `onlyRole`, generated, not imported), and `generated/solidity/surface.json` listing every external function for the clients; `ortho check` warns on a hand-written external writer with no role modifier (L4.02; K7 Q1, F1) | M6.10 | build | `forge build` compiles the generated files; the SDK reaches every external function; a hand-written writer with no role gives a check warning | M |
| M6.12 | Signatures and generated Foundry tests (L4.03) | M6.11 | build | the scaffold gives `0 passed · 24 failed: NotWritten` | M |
| M6.13 | The contract scaffold, its brief, the fuzz cross-check against the reference machine generated from the blueprint, driving the generated client with its pre-check (L4.04; K7 Q8) | M6.12 | build | the filled vault gives `24 passed`; fixed seeds show no divergence; the planted mutant diverges | M |
| M6.14 | The contract's client from the ABI (L4.05) | M6.13, M1.30 | build | a planted revert reaches the handler as `AllowanceExceeded` | S |
| M6.15 | The signing flow and the in-between state (L4.06, S25); the SDK's submission lifecycle (`simulated → submitted → included → confirmed`, `dropped`, `reverted`, `corrected`), where `confirmed` matches the intent's event, not the transaction (K7 Q3) | M6.14, M1.29, M6.07 | build | `acme allowance spend --wallet olga` succeeds; bob's signature is refused before sending; a second relayer's mined revert still ends `confirmed` | M |
| M6.16 | Worlds with a chain: a vault per organisation, journeys on Anvil (L4.07) | M6.15, M1.31, M6.09 | build | `ortho prove --env local` shows each operation signed by its person | M |
| M6.17 | Contracts in the local pipeline, redeployed only on a new bytecode hash (L4.08, local part) | M6.16 | build | promoting twice with the same bytecode deploys nothing the second time | M |
| M6.18 ∥ | The key-hygiene and custody checks (S29): each wallet declares where its key lives (`device` or `server`), and no key appears in plain text in a binding, a commit or a log. A server may hold keys (Aaron, 18 November 2026, K7) | M6.16 | build | a planted plain-text private key in a binding fails the check; a declared server-held key from secrets passes | S |
| M6.20 | `examples/workshop` (K5): the governance feature, the vote as a contract operation, the publish workflow across D1 and the chain, the forum adapter's stand-in | M6.16, M3.10 | build | a vote twice by one member is refused by the contract through the SDK, the CLI and an action; a publish run links the confirmed proposal to its exact revision | M |
| M6.21 | Moves made by time in Solidity (was L5.02, K23): the generated machine keeps a period and a due time per thing, a lazy reset worked out on the next call, `NotDue` and `NotKeeper` refusals, the keeper's role in the contract; the period's anchor the same as the TypeScript machine's | M6.13, M8.09 | build | `forge test` passes with a case for each time move from each state; the fuzz against the TypeScript machine steps the clock and finds no divergence | M |
| M6.19 | **Gate M6** | M6.02, M6.07, M6.09 to M6.18, M6.21 (M6.20 dropped by K9) | e2e | `nx run e2e:m6` passes on `main` | S |

## M7: The cloud, then Capxul

**Goal.** Every local destination swapped for the real one, each credential created only with Aaron's written yes and
the spend under $10 a day; then Capxul's first feature running on Orthograph.
**Staging first** (K10 section 8, Aaron, 18 November): `spikes/staging-pass` any time (acme up on a dedicated
Cloudflare account, proved there, destroyed, the account listing nothing after); then, after Gate M2, M7.01, M7.03,
M7.04 and M7.08 for staging alone. npm's `latest` tag, Homebrew and the rest of M7 still wait on the stage 4 gate; the preview under `next` is M1.51 (K28).
**Gate.** `nx run e2e:m7`: acme goes from a pull request to test, staging and production on Cloudflare with a verdict
in each, Orthograph's packages are released under `@orthograph` on npm, and everything the gate made is destroyed after.
Capxul's first feature runs in its staging.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M7.01 | The cloud pass for staging (K10 section 8): the `orthograph-staging` account Aaron approved in K10, its token's scope, a cost estimate under the cap, which secret store `Cloudflare.secrets` means | Gate M2 | decision | `decisions/M7-cloud.md` written, with Aaron's yes per credential | S |
| M7.02 | The npm org `@orthograph` (Aaron signs in) and Orthograph's first real release | M7.13 | build | `npm view orthograph` shows the release | S |
| M7.03 | The infra projection: an Alchemy stack per environment from the model and mounts | M7.01 | build | `ortho env up staging` plans the expected resources | L |
| M7.04 | Deploy and destroy on Cloudflare (L2.01, cloud part) | M7.03 | build | `ortho env destroy` leaves nothing in the account | M |
| M7.05 | Test worlds and signed verdicts from GitHub Actions (L2.02, L2.03, cloud parts) | M7.04, M7.13 | build | a pull request gets a verdict signed with GitHub's OIDC token | M |
| M7.06 ∥ | Real releases: npm, Homebrew, GitHub (L2.06, cloud part) | M7.02 | build | `brew install` of acme's CLI works from the real tap | S |
| M7.07 ∥ | Adapters against the real vendors: Stripe test mode, `provision`, conformance | M7.04, M7.13 | build | the conformance test passes against Stripe's test mode | M |
| M7.08 ∥ | The builder's read-only staging telemetry token (with Aaron's yes) | M7.04 | build | an unattended builder reads staging traces, redacted | S |
| M7.09 ∥ | Contracts on a testnet (L4.08, cloud part) | M7.04, M7.13 | build | a changed vault is redeployed and verified | M |
| M7.10 | Capxul's plugins mapped: which exist, which are new, which are Capxul's own | none (K34) | decision | `decisions/M7-capxul.md` written | S |
| M7.11 | Capxul's first feature on Orthograph, in its staging | M7.10, M7.05 | build | its journeys are green in Capxul's staging | M |
| M7.13 | The release pass: the credentials the release needs (npm, Homebrew tap, GitHub, Stripe test mode, a testnet), each with Aaron's written yes, and the cost under the cap | M7.01 (K34) | decision | `decisions/M7-release.md` written, with Aaron's yes per credential | S |
| M7.14 | Monitors to the sink ([`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md)): the same rule list written to each declared sink (Axiom monitors with the burn rate in APL; Grafana alert rules and dashboards through its Foundation SDK); `alerts` routes on the environment file, which can only lower a severity | M1.49, M7.01 | build | in the staging pass the generated monitors exist with their labels; 20 slowed calls fire the builder route; a route that raises a severity fails `ortho check`; every monitor is destroyed afterwards; production routes compile, and nothing pages without Aaron's written yes | M |
| M7.12 | **Gate M7** | all of M7 | e2e | `nx run e2e:m7` passes, and the gate's resources are destroyed | S |

## M8: Time

**Goal.** One clock per world drives everything in it: the server, the database, every `Timers` wait, the local chain,
the follower and the adapters ([`decisions/K23-time.md`](decisions/K23-time.md)). A journey moves a month or a year in
seconds, and every move made by time happens exactly once, on time.
**Ships.** Clocks declared on environments (real, stepped, scaled); the world's clock, timer table and count of work in
flight in its Durable Object; `s.clock` in journeys; `every` and `after` on machine moves, with calendar anchors; the
keeper; adapters that declare their clock; the tenth eval, on time.
**Where it sits** (Aaron, K23 Q1): beside stage two. M8.01 to M8.04 land at once, as decision and checks; the build
slices start at stage one's gate (Gate M2) on `m8`; stage three's gate (ST3.08) waits on Gate M8.
**Gate.** `nx run e2e:m8`: in a fixture world, a journey moves a month and then a year in seconds; the membership
renews exactly once a month, from its start date, on the last day of a short month; the keeper's lapse is on time; at
every step the server's clock, a time written to the database, a `Timers` wait, the chain's latest block and the
follower agree to the second; a session made at the start is refused after its life; a keeper delayed on purpose fails
the on-time eval; a journey through an adapter that keeps its own clock is refused before it starts, naming it; in a
dev world `ortho clock advance "1 month"` renews once and `ortho clock speed` runs a month in seconds with the chain
keeping up; and staging declares a real clock that nothing can move.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M8.01 ✅ | Time as its own milestone: the clock kinds, `s.clock`, moves made by time, anchors, settling a stepped world, each system's hook, adapters' clocks, the blast radius | Aaron's yes, 20 November 2026 | decision | [`decisions/K23-time.md`](decisions/K23-time.md) written with Aaron's calls | S |
| M8.02 | **The first check: a month renews once.** A fixture `membership` thing (`join`, then `renew` by `every("1 month", { from: "startedAt" })`, emitting `MembershipRenewed`) and a journey that joins, moves the clock one month and sees exactly one renewal at the start date plus a month, then moves 15 days and sees none. Listed in `e2e/m8/expected-failing/`; written by an author, never the builder | M8.01 | checks | it fails on `main` for the missing surface only (`Blueprint.time`, `s.clock`), and on an empty `renew` handler | S |
| M8.03 | Checks for the world's clock: at each step of a year the server's `Clock`, a time passed to the database, a `Timers` sleep, the chain's latest block and, in a half that waits for the follower (M6.09), the follower's checkpoint all read the same instant; Better Auth refuses a session after its life; a busy process makes `advance` fail as `NeverQuiet`, naming it; a real-clock environment refuses to move; `ortho check` refuses a stepped clock on staging; its by-hand half is M8.18 ([`decisions/M8-checks.md`](decisions/M8-checks.md)) | M8.01 | checks | they fail on `main` for the missing clock only, and the follower half for the missing follower too, each listed in the ratchet; the controls (a call with no clock move) pass | M |
| M8.04 ∥ | Checks for moves made by time: `every` from a field, a calendar anchor on day 25 and on the last day in a named zone across a daylight-saving change, `after`, `lazy`; a renewal fired twice for one due instant renews once; the keeper can call nothing else; the on-time eval fails for a keeper delayed on purpose; the compiler refuses an anchor on a missing or non-time field, a calendar anchor with no zone, and `by` on a move with no `from`; docs and MCP say when each move happens; its adapter half is M8.18 | M8.01 | checks | they fail on `main` for the missing surface only, and on empty handlers | M |
| M8.05 ✅ | What reads the wall clock behind Effect's `Clock` inside a world: Better Auth, jose, viem, the Worker's own `Date`; whether the Worker's entry can set `Date` to the world's time per request on workerd, and what that costs | M8.01 | spike | `spikes/world-time-in-worker/README.md` (merged in #210: yes, about 30–40 µs a request) answers it with a run: a Better Auth session made at the start is refused after `advance("8 days")`, or the fallback is named | S |
| M8.06 | The world holds the clock: `Blueprint.clock` on environments, in the model; the world's Durable Object keeps the instant and answers `/_world/clock`; the Worker's entry provides `Clock` (and, per M8.05, `Date`) from it for each request: the `Date` proxy is installed once and each request runs inside `AsyncLocalStorage.run(worldInstant, …)`, never a global assignment; every entry wraps itself (each Durable Object's `fetch`, RPC and alarm, queue consumers, `scheduled`, Workflows steps), and a real world skips the patch; the lint rule gains SQL's `now()`, `CURRENT_TIMESTAMP` and `datetime('now')` | M8.03, M8.05 | build | M8.03's server, database and session halves pass | M |
| M8.07 | Timers and quiet across processes: `Timers` against the world's table (an alarm only in a real world); every process reports work in flight to the world's count; the controller's `advance` and `moveTo` with the same-instant order (due instant, then the order set, then owner); `NeverQuiet` names who is busy; `s.clock.advance`, `.moveTo` and `.now` in journeys | M8.06 | build | M8.03's `Timers` and quiet halves pass; M8.02 now fails only on the missing `every` | M |
| M8.08 ∥ | The chain moves with the world: `ChainPort.clock` for EVM; Anvil started at the world's start, standing still (a process locally, the container bench alike, `STA-03`); a step sets the next block's timestamp and mines one block; viem clients are one per world and chain with `cacheTime: 0`, and smart accounts get a `nonceKeyManager` (M8.05 found a stale cached block and a `Date.now()` nonce key) | M8.07 | build | M8.03's chain half passes: over a stepped year the latest block's timestamp equals the world's instant at every step | M |
| M8.09 | Moves made by time in the language: `by: Blueprint.time.every` and `.after`, `from`, `on`, `zone`, `late`, `lazy` in `orthograph`; the compiler's checks; the model's `moves.<m>.by`; the docs, MCP description and scaffold say when the move happens | M8.04 | build | M8.04's compiler, model, docs and MCP halves pass | M |
| M8.10 | The keeper: entering a state with a move made by time sets that thing's timer, leaving clears it; the keeper fires through `Timers` as counted work, as its own `system` principal, with a request key of thing, move and due instant; a lazy move is worked out at the thing's next use | M8.07, M8.09 | build | **M8.02 passes**; M8.04's keeper, anchor and exactly-once halves pass | M |
| M8.11 ∥ | Adapters declare their clock (`"world"`, `Adapter.testClock(…)`, `"own"`); stand-ins read the world's time; the controller moves a test clock at each step; prove refuses a journey that moves time and reaches an adapter with its own clock; a real issuer's token is checked with real time (`currentDate`), per M8.05 | M8.07, M1.30, M8.18 | build | M8.04's adapter half passes, with a fixture adapter of each kind | S |
| M8.12 | The on-time eval (the tenth): every move made by time happened at its due instant within `late`; a lazy one checked at its first use; the portal and `watch` show each move's lateness | M8.10 | build | M8.04's on-time half passes, the delayed keeper failing it | S |
| M8.13 | **Moving time by hand, in one slice** (Aaron, K23 Q2 and Q3): `ortho dev` runs a scaled clock from one second per second; `ortho clock` (the world's time beside the real one), `ortho clock advance <span>`, `ortho clock speed <factor>` and `ortho dev --speed`; the portal's world bar shows the world's time with a move-forward and a speed control, in dev worlds only; at every speed, one second per second included, a ticker sets the chain's next block time to the world's each real second (Anvil stands still otherwise); refused on a real clock | M8.08, M8.10, M1.13, M8.18 | build | M8.03's by-hand half passes: at the default speed the chain's block time keeps up with the world's, an advance in a dev world renews once, a month at speed 2,592,000 takes about a second with the chain within one tick, and `ortho clock advance` against staging is refused | M |
| M8.14 ∥ | The grid's `time` block: its row and nine cells in `design/grid/grid.json` with today's grades from K23's blast radius, `design/grid/types.ts`'s `BlockId` and counts, and the grid's summary sentence | M8.01 | build | `node -e "const g=require('./design/grid/grid.json');console.log(g.blocks.some(b=>b.id==='time'), g.cells.filter(c=>c.block==='time').length)"` prints `true 9` | S |
| M8.15 ∥ | The canon's `time` page (the canon thread): clocks, `s.clock`, moves made by time, anchors, the keeper, adapters' clocks; the glossary | M8.12 | build | `node docs/canon/check.mjs` passes, and `docs/canon/outline.md` has a `time` row owning the words clock, keeper, every and after | S |
| M8.17 ∥ | The follower keeps time with the world: it reports busy to the world's count until it has read the chain's head, and its own bookkeeping reads the world's `Clock` | M8.08, M6.09 | build | M8.03's follower half passes: over a stepped month the follower's checkpoint time equals the world's at every step, and `advance` does not return before it has caught up | S |
| M8.18 | Checks for the halves that need stage one's harness ([`decisions/M8-checks.md`](decisions/M8-checks.md)): M8.03's by-hand half, in a dev world with a chain at the default speed, a transaction a minute in is mined within one tick of the world's time, `ortho clock advance "1 month"` fires what was due once, in order, `ortho clock speed 2592000` passes a month in about a second with the renewal once and every block within one tick, and the portal shows the world's time beside the real one; M8.04's adapter half, prove refusing before it starts, naming the adapter, a journey that moves time and reaches an adapter mounted with `clock: "own"`, beside one with `"world"` and one with a test clock that pass. Listed in `e2e/m8/expected-failing/`; written by an author | Gate M2 (stage one's dev worlds and adapter packages on `main`) | checks | they fail on `main` for the missing clock and adapter clock only | M |
| M8.16 | **Gate M8** | M8.02 to M8.15, M8.17, M8.18 (and so M6.09, from stage 2) | e2e | `nx run e2e:m8` passes on `main` | S |

Elsewhere, for the same decision: M4.26 (agent waits on the world's clock, was L5.08) and M6.21 (moves made by time in
Solidity, was L5.02).

## Later

- **Noir** ([`frame/examples/private-membership.md`](frame/examples/private-membership.md), N1, S28, S30), with the workshop's private membership as its example (K5 seam 7). `language-noir` and the `aztec` store kind, designed in K7. Any claim about proofs runs in a `proofs: "verified"` world (the in-process network with `realProofs: true`, K7 Q7); the CLI local network accepts forged proofs. A production promote still needs a network that verifies rollup proofs.
- **Solana**: `language-solana` (Anchor 1.2.2), the `solana` store kind and `chain-solana` on the same `ChainPort`, designed in K7 and spiked in `spikes/chain-languages/solana/`.
- **The Python client** ([`frame/examples/python-sdk.md`](frame/examples/python-sdk.md), S31 to S33).
- **EIP-7702** delegation (L3.09), off the path as the old plan allowed.
- **Baselines** (A9). The Docker sandbox for agents (A7) is dropped: no Docker (K10 section 8); E2B, then Cloudflare Containers, take its place.
- Sequence diagrams as journeys (S5) and project-wide ratchets (S6).

## Where every unfinished build-plan step went

| Step | Now | | Step | Now |
|---|---|---|---|---|
| D4 | M1.01 | | L4.01 | M6.10 |
| L3.01 | M1.05 to M1.10, M1.14 | | L4.02 | M6.11 |
| L3.02 | M1.29 | | L4.03 | M6.12 |
| L3.03 | M2.05 (auth as a plugin), M2.13 (SIWE) | | L4.04 | M6.13 |
| L3.04 | M1.30 | | L4.05 | M6.14 |
| L3.05 | M1.31 | | L4.06 | M6.15 |
| L3.06 | M6.07 | | L4.07 | M6.16 |
| L3.07 | M1.32 | | L4.08 | M6.17 (local), M7.09 (testnet) |
| L3.08 | M6.09 | | L4.09 | M6.19 |
| L3.09 | Later | | D6, L5.01 to L5.03, L5.05 to L5.08 | M8 (K23); L5.02's Solidity half M6.21, L5.08 M4.26 |
| W1 | M3.04 | | L5.04 | M3.10 (factory), M5.10 (apps) |
| W2 | M3.06 | | A0 | M4.03 |
| W3 (with F4.1, F4.2) | M3.07, M3.09 | | A1 | M4.04 |
| L3.10 | M6.19 | | A2 | M4.05 |
| D5 | M6.01 | | A3 | M4.07 |
| A4 | M4.08 | | A5, A8 | M4.14 |
| A6 | M4.09 | | A7, A9 | Later |
| Cloud parts of L2.01, L2.02, L2.03, L2.06 | M7.04 to M7.06 | | | |

S2 to S6, I1, I2 and D3 carry no tick in the build plan's table, but Gates 1 and 2 passed after them, their spikes are
in `spikes/` and D3's records exist, so they are done in substance.

**Dropped, with reasons:**

- D4's old recommendation of a `kit:` namespace in the model: mounts are named by their file's path (K2).
- The config file's `outputs`: never read (D3 #112); projections are mounted instead (M0.03, M1.11).
- "Kit" and "dependency" as words: they become feature and adapter (K2, Q3).

## The critical path to workable

Re-cut on 19 November 2026 by [`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md): first lock down
what exists, with one Plugged In app dogfooded end to end; the actions, approvals and the agent's way in wait until M3. Changed
by [`decisions/K16-the-scaffold-explains-itself.md`](decisions/K16-the-scaffold-explains-itself.md) on 19 November 2026:
M1.44 and M1.45 come before M1.43, so Plugged In's handlers are written from the scaffold that explains itself; and,
after Aaron's "make sure this is handled" the same day, M1.46 to M1.48 too, so they are written against what the runtime
hands in. [`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md) (Aaron, 19 November 2026:
"K18 all A") adds M1.49 right after M1.13, so Gate M1 waits on monitoring derived from the model, local only.

```text
M1.40 (the Plugged In app) → M1.41 (the loop's check) ────────┐
M1.44 (the scaffold explains itself) → M1.45 (journey stubs) ─┤
M1.46 (handed in, not found) ──────────────────────────────────┴→ M1.43 (its handlers), M1.42 (the basics) ┐
M1.35 (one visibility rule), M1.36 (telemetry carries the model) ─────────────────────────────────────────┼→ M1.13 (the portal as a viewer)
M1.34 (portal-ui) ────────────────────────────────────────────────────────────────────────────────────────┘
  → M1.49 (monitor, derived) → Gate M1 → the npm preview
  → M2.01 → M2.03 → M2.05 → M2.07 → M2.10 → Gate M2 (workable)
```

**Beside it:**

- **M1:** M1.33 (processes, not containers), M1.12 (the SDK contract, after M1.35), M1.38 (confirmation per chain),
  M1.39 (the canon's wallets page, in the canon thread's pass), M1.47 (one refusals table, after M1.46), M1.48 (the
  compiler refuses an unfillable event), M1.50 (one `Graph` for machines, the map and the worlds, after M1.13).
- **M2:**
  - M2.02 (the checks) and M2.04 (secrets) after M2.01.
  - M2.06, M2.08 after M2.05.
  - M2.09, M2.11 after M2.07.
  - M2.14 to M2.16 (`ortho add` on Nx) from Gate M1.
- **Stage 1:** ST1.02 (the journeys) from M1.40; ST1.03 after it; ST1.26 (the checks) and M1.23 from today, then M1.22 and ST1.25 (K29, Goal 5), then ST1.04; ST1.28 from today, gating ST1.27, Goal 6's cutover (K31), beside them; ST1.07 after M2.05.

The M1 and M2 gates need every slice, so the side slices must land before them.

**After workable (K9):** stage 2 (wallets) next, then stage 3 (the vault), stage 4 (the club) and the release. Capxul's
first plugin, the wallet, is stage 2.
Time (M8, K23) is built beside stage 2, from the same gate; stage 3's gate waits on Gate M8. Its decision and checks
(M8.01 to M8.04) may land before then.

## Risks

1. **The rename touches everything.** Mechanical slices only (M0.02, M0.03), the old gates as the net, and a lint rule
   so the old names can't creep back.
2. **"Identical output" in M1.11 to M1.13 may hide real changes.** Only header paths may differ, and the diff is part of
   each slice's evidence.
3. **Codex's checks carry the old shape.** They are ported as authored checks, re-run red before any builder starts
   (M1.02), and rewritten where the frame differs rather than built to.
4. **Effect 4.1.3 and the experimental Cloudflare engine.** Upgraded in its own slice (M3.02), spiked before use
   (M3.03), behind a seam; the fallback is a hand-written Durable Object workflow.
5. **Pi's closure on workerd** (M4.09) may not bundle or may be too big. Measured first; the fallback is running agent
   runs on the Node host.
6. **A small local model can't build much.** The M4 gate uses it for durability, roles and the join. How well builders
   build is measured in the bench (M4.14), with a real model, off the gate.
7. **Workable rests on the least specified slice**, a plugin's own CI (M2.10). M2.01 settles its shape first.
8. **Time is its own milestone (M8, K23).** Settling a stepped world across processes is the hardest runtime problem
   in it, and libraries inside the world read the real clock themselves. Contained by the clock spike's three rules,
   counted work in every process, and a spike (M8.05) on giving those libraries the world's time before anything is
   built on it.

9. **MariaDB from workerd is unproved** (M5.13). Spiked first; the fallback is the adapter running on a Node host beside
   the Worker, with the same port.