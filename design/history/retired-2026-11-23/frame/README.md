# Blueprint: the whole system

A frame, not yet a decision. Written 17 November 2026 from a reading of the whole design (`decisions.md`,
`build-plan.md`, `docs/index.html`, `history/`, the D, F, G, H, N and O records, the wayfinding notes) and of acme's
code on `layer/3` at `3bacbf3`. Aaron agreed with its first version ("mostly correct") and asked for the rest. Where it
disagrees with `decisions/K1-kits.md` section 3, this frame is the newer thinking; once its DX is worked through, the
records are brought in line.

| Document | What it covers |
|---|---|
| this one | the whole system: every concept, one meaning each, and how they relate |
| [`mounting.md`](mounting.md) | where things live in a project, and what mounting a plugin does at each stage |
| [`adapters.md`](adapters.md) | the outside world: calls out, events in, other apps, stand-ins in worlds |
| [`secrets.md`](secrets.md) | who declares a secret, who may read it, where its value lives |
| [`projections.md`](projections.md) | how a description becomes real: many projections, each written out |
| [`builder.md`](builder.md) | the agent that builds an app: how it runs, its tools, code mode, telemetry |
| [`deployment.md`](deployment.md) | from a commit to a running system: build once, verdicts, promote, release, watch, rollback |
| [`writing-a-feature.md`](writing-a-feature.md) | writing the wallets feature, step by step |
| [`story.md`](story.md) | **start here**: one allowance from an idea to production and back, the spine of the frame |
| [`generators.md`](generators.md) | everything Orthograph generates and scaffolds, including the agent files that close the loop |
| [`skills.md`](skills.md) | the skills any agent uses to build on Blueprint, from an idea to a watched operation; the workflows; the tools ([`skills-questions.md`](skills-questions.md): Aaron's round) |
| [`examples/`](examples/README.md) | worked examples: agents, the factory, payments, notifications, on chain, Noir, Python |
| [`questions.md`](../../../frame/questions.md) | every open question, in one round |
| [`../milestones.md`](../../../milestones.md) | the recut: milestones M0 to M7, their slices and gates; workable at the end of M2 |
| [`delta.md`](delta.md) | every weakness found, how this frame answers it, and the order to close the gap |

## The name (Aaron, 18 November 2026)

The framework is **Orthograph**: the command `ortho`, the npm scope `@orthograph`, and the front door the plain
package `orthograph` (`decisions/K6-orthograph.md`). **Blueprint** is still what you write: the `blueprint/` folder
and the `Blueprint.*` API. How every name is spelled, and where it lives, is in [`../naming.md`](../../../naming.md).
Where a frame document says Blueprint for the framework itself, read Orthograph.

## In one breath

You write one description of a system. Everything else is a projection of it. The only thing written by hand is
behaviour, inside frames the description generates. Everything that runs is judged against the description by the same
names.

## Four principles

1. **One description.** What exists (things), how it changes (machines, operations), who may change it (roles), what is
   recorded (events, steps), what must hold (journeys). That is the blueprint; compiled, it is the model.
2. **Many projections.** The server is the description projected onto a host. The SDK, CLI and MCP are projections onto
   callers. Docs and the portal are projections onto readers. Solidity is a language on a chain host (K27). A world
   is the description running for a test. None of them is the system; each is a view of it.
3. **Behaviour is the only freehand.** Handlers fill blanks in generated frames. Their types come from the declaration,
   so code that breaks the contract doesn't compile.
4. **Evidence comes back under the same names.** Spans, events and refusals carry the names that came from paths. Evals
   read the evidence and judge it against the description.

"Never drifts" follows from two rules: nothing is written twice, and everything written by hand is both framed by the
description and judged against it.

## The map

```text
                    ┌────────────────────────── the description (blueprint/) ───────────────────────────┐
                    │  your things, operations, roles, journeys     (the root feature)                  │
  plugins ─mount──▶ │  features   what else the system is           e.g. auth, wallets                  │
                    │  adapters   what is outside it                e.g. stripe, an EVM chain, MetaMask │
                    │  projections what it becomes                  e.g. server, sdk, cli, mcp, docs    │
                    │  environments where each projection lives, credentials, settings, secret sources  │
                    └───────────────┬───────────────────────────────────────────────────────────────────┘
                                    │ compile
                                    ▼
                                  model  ── one JSON, hashed, every name once ──┐
                                    │                                           │
              generate (each projection renders its outputs)        brief, scaffold (blanks for behaviour)
                                    │                                           │
                                    ▼                                           ▼
                 outputs: a Worker, an npm SDK, a CLI binary,         src/: handlers, client code, contracts
                 an MCP endpoint, docs, a portal, contracts            (the only hand-written logic)
                                    │                                           │
                                    └──────────────────┬────────────────────────┘
                                                       ▼
                        a world (a running environment, made for a purpose, destroyed after)
                                                       │  journeys run through every projection
                                                       ▼
                         evidence: spans, logs, events, refusals ── named from the model
                                                       │
                                                       ▼
                         evals judge it ─▶ verdict per operation, revision, environment ─▶ logbook
                                                       │
                                                       ▼
                    a change to the description marks exactly what depends on it stale, and it goes round again
```

## Every concept, one meaning

### The description

| Word | One meaning |
|---|---|
| **blueprint** | the description and the folder `blueprint/`, written with the `Blueprint.*` API; the framework itself is Orthograph |
| **model** | the compiled blueprint: one JSON, every declaration with its hash, every name written once |
| **thing** | a noun with an identity, fields and an owner of its state (`lives`: the database, an actor, a chain) |
| **value** | a named field type that says what it is in every target (`Blueprint.uint(128)`: bigint in Effect, uint128 in Solidity; money is `Blueprint.money`, M6-money) |
| **machine** | a thing's states and moves; refusals for a wrong state are generated |
| **event** | what a move emits, `<Thing><PastTense>` |
| **error** | a declared refusal, with an exit code and a stable refusal code |
| **operation** | a verb on a thing: payload, answer, errors, move, `allowed`, steps, budget, `runs`; named by its path |
| **read** | an operation that changes nothing and has no handler |
| **step** | a named span inside an operation: a database write, a wait, a call (`Blueprint.step.call`: another operation, or an adapter's call), or a use of a feature's export (`Blueprint.step.use`) |
| **role** | who may call: a right over one thing decided by a rule (`owner.of(...)`), a built-in role (`anyone`, `signedIn`), or a service role (`Blueprint.role(Payment, { service: stripe })`); any of them narrowed by way in (`.via(Via.session)`, `.notVia(Via.agent)`) |
| **principal** | who is calling: anonymous, a person, an agent acting for a person, a service (an outside system, through an adapter's door), or the system (the keeper); see the table below |
| **journey** | a story through real operations, played by a cast, written by a different agent from the builder |
| **starting world** | a named setup, made by running operations, never by writing rows |

### Plugins and mounts

| Word | One meaning |
|---|---|
| **plugin** | something built once that any project can mount: a feature, an adapter or a projection |
| **feature** | a plugin that adds to what the system *is*: things, operations, handlers, journeys, exports. The app itself is the root feature |
| **adapter** | a plugin that brings something *outside* into the description: calls out, events in, a principal kind, a stand-in for worlds |
| **projection** | a plugin that makes the description *real* in one form: renders outputs, replays journeys (if callers use it), says where it runs and how it ships |
| **mount** | one file in `blueprint/<kind>/<name>.ts` that says "use this plugin here, with these choices"; the file's name is the mount's name |
| **export** | typed functions a feature offers your handlers (an internal command), with an implementation per host, such as `Payments.refund` or `Signer.sign`; used with `Blueprint.step.use` |
| **call** | what an adapter offers: one operation of the outside system, typed from its contract, such as `stripe.calls.refunds.create`; called with `Blueprint.step.call` |
| **need** | a plugin another plugin requires, named in its descriptor (`needs: [auth, Blueprint.need(eip1193, { when: … })]`); the app mounts it once |
| **mount verbs** | the only four things a mount may say: **choose** (an option the plugin proved), **include** (which of an adapter's calls and events are reachable), **narrow** (fewer ways in, fewer operations), **omit** (drop an operation) |
| **choice** | an option a plugin offers at mount time, picked by reference from what the plugin has proved; never varies by environment |
| **setting** | a value a plugin declares that each environment gives (`wallets.settings.chains.is([1, 8453])`), such as which chains, which region |

### Where code runs

| Word | One meaning |
|---|---|
| **host** | a kind of machine code runs on, one namespace: `Host.worker`, `Host.node`, `Host.browser`, `Host.chain`, `Host.native`, `Host.python`, and `Host.world` (an implementation used only in worlds, such as the Anvil-backed signer). A projection names its hosts; a client operation's code is written per host |
| **runs** | where an operation's behaviour must execute: on the `server`, at the `client` (the caller's host), or on a `chain` |
| **output** | a file or folder a projection writes, under `generated/<mount>/`; the one exception is a scaffold written once into `src/` (a handler, a contract) |
| **artifact** | what an output becomes when shipped: a deployed Worker, a published package, a released binary, or a file kept in the repository (docs, the model) |
| **door** | an entrance a server-hosted projection opens: the API, the MCP endpoint, an adapter's inbound endpoint, and in a world the world door (`/_world/*`) |
| **environment** | one file per environment: where each projection lives (deployed at a domain, or released under a tag), which credential kinds it issues, its settings, and where each secret's value comes from |
| **world** | a running copy of an environment, made for a purpose and destroyed after: its own storage, clock and cast |

### Proof

| Word | One meaning |
|---|---|
| **evidence** | what a call left: its caller, answer or refusal, events, spans and logs, all under model names |
| **eval** | a rule over evidence: nine built in (answer shape, declared errors, machine path, events, who may call, steps, budget, coverage, explainability), a tenth for time |
| **verdict** | all of an operation's evals at one revision in one environment; only CI writes one |
| **stale** | a verdict whose evidence predates a change to something the operation uses |
| **uses** | the model's uses graph: what an operation reads, so a change knows what it makes stale (the word "dependency" is retired) |

### Principals and how each gets in

| Kind | How it gets in |
|---|---|
| anonymous | nothing; only `anyone` admits it |
| person | `Via.session`, `Via.key` or `Via.device` |
| agent, acting for a person | `Via.agent`: a credential made for an agent, such as an OAuth token from the MCP sign-in or a key made for an agent |
| service | an adapter's door: the outside system's own verification, such as Stripe's signature |
| system | the runtime's own work: the keeper, `on:` and workflows; it has no credential |

### Audiences

| Who | What they get, all projections |
|---|---|
| **callers**: people, agents, other systems | the API, the SDK, the CLI, the MCP server, an app |
| **readers** | docs, the portal |
| **builders**: the agents and people making the app | briefs, scaffolds, the builder MCP, `check`, `prove`, `impact`, telemetry by name ([`builder.md`](builder.md)) |
| **operators** | `watch`: the same evals on what the live system records |

## How the pieces relate

- **A feature's operations meet projections through two fields.** `runs` decides which hosts can carry it; `allowed`,
  with `via`, decides which callers may reach it. A projection includes an operation when it can host it and its
  callers' way in is admitted. Nothing names a way in by hand.
- **Features need adapters and other features; they never contain them.** A payments feature *needs* the Stripe
  adapter; the app mounts Stripe once, and the feature, the app's handlers and the webhook share that one mount, its
  secret and its stand-in.
- **Adapters and projections are mirror images.** A projection turns our model into an artifact for others; an adapter
  turns someone else's contract (an OpenAPI document, an ABI, another Blueprint app's model) into a piece of our model.
  Our published SDK and model are exactly what another app's adapter consumes.
- **Everything that changes state is an operation call.** A person through the CLI, an agent through MCP, Stripe through
  a webhook (as a `service` principal, through its adapter), the keeper on time: each is a call, checked by roles and
  proven by the same evals.
- **Environments bind; worlds run.** An environment says where each projection lives and where secrets come from; a
  world is one running copy of it, with stand-ins for every adapter that has one.
- **Proof follows the plugin kinds.** A feature brings journeys. An adapter brings a conformance test against its
  stand-in. A projection that callers use replays the journeys it takes; the rest say "not proved by replay". A
  language brings the tests it generates and agreement with the Effect machine; a host brings a world to run in.

## Each plugin brings its proof

- **A feature** brings journeys, proved in its own example app and again in every app that mounts it.
- **A projection that callers use** replays every journey it takes through itself: the same story through the SDK, the
  CLI and MCP must leave the same evidence. Docs, infrastructure and the like are "not proved by replay". Today journeys call the server over raw HTTP (`prove/.../journeys/internal/world.ts:85`), so the SDK,
  CLI and MCP are never proved by a journey.
- **An adapter** brings a conformance test against a stand-in that runs in the world.
- **A language** (K27) brings the tests it generates for its frame and, for any language after Effect, a fuzz that
  runs the same moves through its code and the Effect machine and must find no difference.
- **A host** (K27) brings a world: its place stood up locally (workerd and D1, or Anvil for `Host.chain`), where the
  journeys run.

## What a person looks at

```text
blueprint/
  things/          your own things: the root feature
  features/        mounted features, one file each
  adapters/        mounted adapters, one file each
  projections/     mounted projections, one file each
  environments/    where each projection lives
  journeys/  starting-worlds/  values/
src/               how it behaves: the only hand-written logic
generated/         everything else; never edited
```

There is no loose config file: what the app becomes is mounted like everything else ([`mounting.md`](mounting.md)
grades this against keeping projections in a config file).

## The loops

1. **Design**: ideate, spike, specify, until the blueprint has no blanks. Each blank is a question in the portal.
2. **Build**: brief, fill, check, prove. A builder fills one blank against its brief, never seeing the journeys.
3. **Ship**: promote a revision with green verdicts from one environment to the next; publish what is released.
4. **Watch**: the same evals on what the live system records. A measure that gets worse becomes a task.

A change to the description sends exactly what uses it back round.

## Where today's design falls short of this

- The model leaves out journeys, starting worlds and role rules, and drops an operation that still has a blank
  (`compiler/.../describe.ts:99`), so an unfinished model looks smaller rather than unfinished (F2 section 0).
- A proof is keyed by blueprint hashes, not handler bodies (F1, `later.md`).
- Principals are `anonymous | person` only; an agent acting for a person looks like the person (F5 section 4).
- "Dependency" means three things and "output" three; this frame retires the first (`uses`, adapter calls, adapter
  reads) and narrows the second (output, artifact).
- Projections are fixed renderers, and the config that names them is read by nothing (D3 #112).
- Secrets are named by strings in each environment, and handlers have no way to use one ([`secrets.md`](secrets.md)).
- The builder has the CLI only ([`builder.md`](builder.md)).
- The starter copies the auth things into each project, which clashes with auth being a feature (D2 #61, L3.03).
