# The delta: what we have, what is weak, what we need

Part of the frame ([`README.md`](README.md)). Written 17 November 2026, from the reading of `origin/layer/3` and the
whole design that produced this frame. Aaron asked for every weakness, flaw and hole to be kept, with how the new
version answers each, and for the gap between today and the goal. This is that list. Each row cites its evidence.

## What we have today (`origin/layer/3`, all local)

- Declare things, machines, operations, roles, events and journeys in TypeScript under `blueprint/`.
- A compiler that turns them into a model, and generators that render a server, an SDK, a CLI and an MCP endpoint.
- A generated server on workerd: one Worker, things living in D1 or in a Durable Object each, with a lock and an outbox.
- Worlds: a fresh copy of the whole system per run, made and destroyed as one unit.
- Journeys and evals, verdicts written by CI with a signed token into a logbook (a Durable Object).
- `promote` of the exact bundle, a version worked out from the model diff, release to a local npm (Verdaccio) and a
  local Homebrew tap, and `watch` over live traces through `TraceSource`.
- The work app (`examples/work`, F5) on `main`: 6 things, 26 operations, one blank; a fuller version on
  `spike/work-real`. The agent feature is designed (H1, H2) but not built on any branch.
- Codex's work on `layer/4`, not merged: a kit and dependency decision (`D4.md`) and six end-to-end author checks
  (`e2e/layer3/`). Codex is dropped; questions Q3 decides what we keep.

## Weaknesses, and how the new version answers each

### The model is incomplete

| Weakness | Evidence | The answer |
|---|---|---|
| The model omits journeys, starting worlds and role rules | F-series reading of `describe.ts` | The model is the one contract: everything declared is in it, or agents and projections can't see it ([`projections.md`](projections.md)) |
| Operations with blanks are dropped from the model | `describe.ts:99` | A blank is part of the model, marked as a blank; it is what becomes a builder task ([`builder.md`](builder.md)) |

### Proof

| Weakness | Evidence | The answer |
|---|---|---|
| Verdicts are keyed by the blueprint's hash, not the handler code they judged | logbook entries | A verdict names the model hash and each handler body's hash, so a changed handler is stale by itself |
| The logbook keeps one pass or fail per run | logbook schema | One verdict per operation per journey, so `promote` and the manager agent can name what is missing |
| Journeys call HTTP directly and skip the SDK, CLI and MCP | `prove/.../journeys/internal/world.ts:85` | Journeys run through a projection's client, so each shipped client is proved, not only the server |
| `prove` traces are headless; payload attributes are recorded before the allowlist; loss is silent when the Collector is down | L2.P, telemetry records | Every run, prove included, traces under model names; the allowlist runs first; a lost span is counted and reported |
| The commit has no span; free text is traced; refusals before the span leave no count | `service.ts:71`, `visibility/types.ts:1`, `service.ts:46,104` | A commit span with its outcome and the attempt; text untraced unless marked; every call counted as a metric ([`../decisions/O2-trace-gaps.md`](../../../decisions/O2-trace-gaps.md)) |

### Plugins and outputs

| Weakness | Evidence | The answer |
|---|---|---|
| Projections are fixed renderers; `outputs` in the config is never read | `render/service.ts:13-24`, D3 #112 | Projections are plugins, mounted one file each under `blueprint/projections/` ([`mounting.md`](mounting.md)) |
| The starter copies the auth things into every project | `examples/acme` | Auth is a feature, mounted, upgraded like any package |
| "Dependency" and "output" each mean three different things | design docs | One glossary, one meaning each; "dependency" retired ([`README.md`](README.md)) |
| MCP is served at `/mcp` and also declared as its own Worker | `render/internal/server.ts:145-147`, `environments/production.ts` | MCP is a door of the one Worker, with an optional domain routed to it (decided, Q2) |

### The outside world and secrets

| Weakness | Evidence | The answer |
|---|---|---|
| Nothing calls out to another system, and nothing receives a webhook | `decisions.md` layer 3 plans only | Adapters: calls as steps, events in through `on:`, a stand-in and a conformance test ([`adapters.md`](adapters.md)) |
| Secrets are named by string in each environment, and no handler can use one | `environments.test.ts:14` | The plugin that needs a secret declares it; the name is derived; only its layer reads it, as `Redacted` ([`secrets.md`](secrets.md)) |
| "Local, never fake" is at odds with the mock OIDC issuer and Verdaccio | D3 #8, L2.06 | The stand-in ladder, labelled in the evidence: real process, real compatible software, the vendor's own mock, the vendor's sandbox. Never our own fakes (decided, Q1) |

### Who calls

| Weakness | Evidence | The answer |
|---|---|---|
| A principal is only `anonymous` or `person` | `roles/types.ts:6-8` | Add `agent`, `service` (an adapter's door) and `system` (the keeper) |
| Two role models disagree (`holds` and `owner.of`) | design records | One role model: a role is a `rule`, or declared with `who` or `holds`, and `.of(...)` works on each ([K20](../../../decisions/K20-roles-across-things.md)); the new principals are M2.01's |

### Data

| Weakness | Evidence | The answer |
|---|---|---|
| A list read over things that live as actors is impossible | F5 | Views: read models built from events, declared, kept by the system (the data question, open) |
| No idempotency by request on actors | F5 | Every operation call carries a request id; the actor keeps the answers it gave |
| A thing picks from a closed list of homes, and an environment binds one database | `things/types.ts:32`, `environments/local.ts:6` | Stores of open kinds, supplied by hosts and languages; a thing lives in a declared store or the default; environments bind only what differs ([`../decisions/K3-stores-and-sources.md`](../../../decisions/K3-stores-and-sources.md)) |
| A system we don't own (Capxul's bench on MariaDB) has nowhere to go | Aaron, 18 November | A source, reached through an adapter: typed calls as steps, real MariaDB as its stand-in, conformance, never migrated (K3) |
| One owner per call | F5 | Cross-actor work runs as a workflow, not as one call |
| No migration when a thing's states change | deferred in `decisions.md` | Migrations generated from the model diff, ordered per environment ([`deployment.md`](deployment.md)) |
| The outbox is built but not designed | host-cloudflare `actors` | Designed with workflows: events leave an actor through its outbox, delivered at least once, keyed for idempotency |

### The builder and the factory

| Weakness | Evidence | The answer |
|---|---|---|
| The builder agent has only the CLI | H1 | One tool layer: code mode over a typed `bp` API, direct tools, our own telemetry tools ([`builder.md`](builder.md)) |
| The agent harness is not built | H1, `build-plan.md:149-166` | Built by us, as the agents example lays out ([`examples/agents.md`](examples/agents.md)) |
| `pi-ai` bundling to workerd is unverified | H1 section 9 | Measured in step A6, with a fallback |
| Effect's Cloudflare Cluster and Workflow package is experimental | H1 section 8 | Usable now under the three-day rule, with `effect` 4.1.3; adopted for durable workflows behind a seam |

### The design itself

| Weakness | Evidence | The answer |
|---|---|---|
| Docs drift: `implementation/handlers` in one place, journeys described in three | design docs | One frame, one meaning per word, and the records brought in line when this frame is decided |
| The layer rule (nothing starts before the previous gate) is at odds with the side tracks | `AGENTS.md`, goals | Side tracks are design and spikes only; code still waits for its layer |
| Everything runs locally; there is no cloud | G1 | The cloud pass: one destination at a time, each credential with Aaron's yes |

## Decided in this frame (Aaron, 17 November 2026)

- The framework is **Orthograph** (its name since K6, 18 November 2026), command `ortho`. **Blueprint** stays the name of what you write (the `blueprint/`
  folder and the `Blueprint.*` API). The npm scope is **`@orthograph`**; not yet created, it
  needs Aaron signed in. The Capxul app keeps `@capxul`.
- "Target" is renamed **language** (Effect, Solidity, Noir, Python), never confused with a host or a projection.
- Dependencies may be three days old, with a named override (`decisions/R1-release-age.md`).
- Codex is dropped; we build Orthograph ourselves.
- **Workable means the end of M2**: plugins mounted and proved, auth and organizations as plugins, the new
  principals, secrets by declaration. From there Aaron builds Capxul's plugins on Orthograph, refining it as he goes;
  the factory (M3) and agents (M4) speed that up but don't gate it. Milestones M0 to M7 are proposed in the chat
  walkthrough of 17 November and still to be litigated.
- **The factory comes before agents, and each works without the other** (Aaron, 17 November 2026). The factory is a
  feature, `@orthograph/work`, with a choice of workers: people (the default: a person, or an outside agent such as
  Claude Code, claims a task through the factory's CLI or MCP) and agents. Picking agents adds an optional need,
  `Blueprint.need(agents, { when: workers.agents })`: the manager starts an agents run on the task's brief, and the
  run's finished event comes back through `on:`. The agents feature knows nothing of the factory. Either way, only a
  fact closes a task. M3 is the factory with people as workers; M4 is agents, proved together with the factory.
- Q1: stand-ins follow the labelled ladder above.
- Q2: MCP is a door of the one Worker.
- Q3: an unattended builder may read staging telemetry, redacted, through a read-only token created only with
  Aaron's yes.

## Still open

Nothing. Every question is decided ([`../decisions/K2-forman-frame.md`](../../../decisions/K2-forman-frame.md)).

## The order to close the gap

Recut as milestones M0 to M7 in [`../milestones.md`](../../../milestones.md).
