# Orthograph's scope: what is built, what is left, and for which release

Read from the code on `goal/stage-1` (at `f7d28a42`) and `goal/on-chain`, 21 November 2026, by four read-only passes
the conductor ran. Status is judged by the code and the tests, never by the ticks in `milestones.md`, which are behind.
The release lines in section 2 are decided: K28, Aaron, 21 November 2026.

Status words: **Built** (in `packages/`, with a test that passes), **Partial** (built, with a named piece missing),
**Spiked** (only throwaway code in `spikes/` proves it), **None** (nothing yet).

## 1. What Orthograph is

You describe a system once, in a typed blueprint, and everything else falls out of it: the server, the SDK, the CLI,
MCP tools, the docs, the portal, telemetry and the proof. "The only code you write by hand is behaviour." Journeys say
what the app must do, and `ortho prove` judges the app against them from real evidence, so a coding agent can climb
them until they are green.

What it is not: two products, a fork of agent-native, or (today) anything in the cloud or on public npm.

## 2. The releases (K28)

No document defined an alpha or a beta before this one. v1.0 was defined (`milestones.md`); K28 puts two releases
before it:

| Release | A person outside can… | Done when | Left to build |
|---|---|---|---|
| **Preview** (`next` on npm) | install Orthograph, write a blueprint, get the server, SDK, CLI, MCP, docs and portal, and prove journeys on their own machine | Gate M1 passes on `main`, and the `@orthograph/*` packages, `orthograph` and the preset are on npm under `next` | milestone 1's last pieces: the chains-and-wallets docs page, derived alerts, machine graphs, the request key in traces; the npm preview itself (added by K28; publish refuses npmjs today); Goal 3's branch landing on `main` |
| **Beta** (stage 1, "workable") | start an app with `npm create orthograph`, sign people in, claim `@name` on a real page, and deploy it to Cloudflare and tear it down | Gate M2 (M2.12) and Goal 3's done check (`e2e:stage1`, staging included) | all of milestone 2 (kinds of caller, auth and organizations as plugins, secrets, `ortho new`), the handles plugin, actions and the web pieces on UI SDK, the three screens, staging deploy and destroy |
| **1.0** (stages 2 to 4) | wallets and pay by handle; a Safe with budgets, agents and time; a private club on Aztec | the stage 2, 3 and 4 gates on `main`, plus M7.01 to M7.04, M7.06 and M7.13 | most of the on-chain milestone, webhooks, workflows, agents, time, all of stage 4, the real release |

**Where Goal 4 falls.** Goal 4 (on chain, end to end) serves 1.0, not the preview or the beta: its slices 2 and 9 to
11 are stage 2 work, and slices 1, 3 to 8 and 12 are stage 3. Only slice 1 (the language and host seam) touches the
core everything else uses.

## 3. The capability map

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
| Request key in traces | None | the portal's calls page says no span carries it | M1.12a |
| Self-explaining scaffold and journey stubs | Built | `projections/.../handlers` | M1.44, M1.45 |
| Plugins, mounts, adapters as steps, projections as plugins | Built | checks 01 to 08 | M1.05 to M1.14 |
| `ortho prove`: nine evals, `--changed`, warm world | Built | checks 29, 30 | M1.16, ST1.23, ST1.24 |
| Prove fails fast on a broken source | None | checks 33 and 36 red; the fix for prove hanging is being built | S-29 |
| Climb check and the grid (331 of 331) | Built | CI `e2e-climb`, `e2e-grid` | Goal 3 |
| Logbook, promote, publish to the local registry, watch | Built | layer 2 checks | L2 |
| Telemetry carrying the model | Built | checks 13, 17 | M1.18 to M1.21, M1.36 |
| Portal viewer: things, operations, lifecycle, rules, traces, journeys | Partial | calls and metrics, the role a caller held, step verdicts | M1.13 |
| Portal monitor and machine graphs | None | `monitor.tsx` is a placeholder | M1.49, M1.50 |
| A Node host | None | the server runs only as a Cloudflare Worker; no slice | none (Goal 4 slice 1 names `Host.node`) |
| npm preview of the framework | None | publish goes only to Verdaccio; no slice | none |

### Stage 1: workable (beta)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Plugged In's seven journeys | Built | 56 of 56 steps green, 21 November; a required CI check on stage 1 | ST1.02 |
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
| The web pieces on UI SDK (K29) | None | no `@orthograph/web`, no `generated/web/` | ST1.25, ST1.06 |
| Plugged In's three screens | None | no `src/web/` | ST1.04 |
| Staging: deploy, run the story, destroy | Spiked | five clean runs in `spikes/staging-pass`; no `ortho env up staging`, no infra projection | M7.01 (decided), M7.03, M7.04 |
| Prove against a deployed address | None | no https client, no D1 facts reader; no slice | none |

### App UI (beta for the screens, then 1.0)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| UI SDK as the interface base | Decided | the UI SDK decision, K24 | K24 |
| A generated piece per operation on UI SDK | Spiked | `spikes/ui-sdk-real-world`; no generator yet | ST1.25 (K29) |
| Agent marks from blueprint meaning | Spiked | three of four map; approval and a hidden payload field can't be declared | none |
| Actions: one per operation, for the page, MCP and the CLI | Spiked | `spikes/agent-native-compat`, `ui-sdk-real-world/src/action.ts` | M1.22, M1.23 (moved into stage 1 by K29) |
| Approvals asked once | Spiked | agent-native checks 04 to 06 | M1.23, M1.37 |
| Portal chat and "Needs you" | Partial | `portal-ui` has the chat parts; nothing uses them | M1.24 |
| One package behind the portal's components (HeroUI Pro today, phased out by K24) | Built | `packages/portal-ui`, check 15 | M1.34 |
| The portal off HeroUI, on UI SDK | None | `packages/portal-ui` wraps HeroUI Pro today (M1.34, check 15) | Goal 6's new client, then ST1.28 and ST1.27 at cutover (K29, K31) |

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
| World clock, moves made by time, the keeper | Spiked/None | `design/spikes/world-clock.md` | M8 |

### Stage 4 and the release (1.0)

| Capability | Status | Evidence, or what is missing | Slices |
|---|---|---|---|
| Private club on Aztec | Spiked | `spikes/noir-private-core`; `spikes/aztec-club` doesn't exist | ST4.01 to ST4.08 |
| Real npm, Homebrew, GitHub releases | Partial | local tap and binary only | M7.02, M7.06, M7.13 |
| CI-signed verdicts | Spiked | `spikes/ci-oidc` | M7.05 |

### Off v1.0's path

The factory and the work board (M3.04 to M3.21), the bench and the builder's tools (M4.11 to M4.14), workspaces and
the building agents (M4.17 to M4.25), Stripe, Resend, adapters from OpenAPI, outbox and views (M5.04 to M5.13), and
Capxul on Orthograph (M7.07 to M7.11). Most are None; the work board and E2B workspaces are Spiked.

## 4. Holes no slice owns

1. ~~The repository's `README.md` is empty, yet `AGENTS.md` serves "the goal in `README.md`"~~: it now holds the goal, from [`model/README.md`](model/README.md) (K30).
2. ~~The npm preview has no slice~~: M1.51 now owns it (K28). The publish code still refuses npmjs.
3. No Node host.
4. Proving against a deployed address (staging) has no slice.
5. Generated screens on UI SDK have no slice, and the blueprint can't declare an approval or a hidden payload field.
6. Stage 2 needs webhooks (M5.01, M5.03) and SIWE linking (M2.13); neither is in any goal.
7. Stage 3's signature collection and the keeper rest on workflows, which have no decision or spike.
8. The journey language's open problems: one world per journey, comparing one answer with the last, and sending malformed payloads.
9. Stage 3's Safe and Hats spike and stage 4's Aztec club spike don't exist, though both stages start from them.

## 5. Where the docs disagree (to fix when the releases are agreed)

1. Noir is under "Later" and in K5 as later, but is v1.0's stage 4.
2. The release list: K9 says M7.01 to M7.04 and M7.06; `milestones.md` adds M7.13.
3. The npm preview is promised after Gate M1, but M7 says npm waits on stage 4.
4. Capxul: "built on it" from M2 in one place, off v1.0's path in another. Answered by K30, section 2: after the beta, beside the stages, never gating 1.0.
5. Staging: after Gate M2 in the milestones, inside stage 1 in Goal 3.
6. `milestones.md` still says "Everything runs locally: no cloud"; the ledger's summary counts are stale.
