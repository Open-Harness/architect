# Decisions

**Decided** means Aaron said so in the design session. **Proposed** means the conductor's draft, which Aaron accepted
as the recommendation to go ahead with ("I'm going for your recommendations"), and which may change with evidence.
Each item names the layer that first needs it.

## What Architect is (decided)

- Architect is Effect, one level up. Effect makes code declare its errors and its needs; Architect makes the whole
  system declare its things, machines, events, errors, steps and telemetry, roles, budgets, environments and
  dependencies. Rich context and scaffolds fall out, for agents to implement or hill-climb.
- It's opinionated, and in exchange measurable, hill-climbable, monitorable and auditable.
- It's agent native: the blueprint is the conversation between a person and their agent, the contract between the
  agents that implement it, and the map that says what a change invalidates.
- It's its own repository, beside capxul-next, built with Aaron in the loop by one local agent. Capxul is a later project.
- Nx is required.

## The dev loop (decided)

- Two loops. Design: ideate, spike, specify, until the blueprint has no blanks. Build: build, test (climb the evals),
  deploy (promote through environments, provisioned from code), watch (the same evals on the running system).
- A change sends exactly what depends on it back round.

## Layout and conventions (decided)

- Three folders, named for who writes them: `blueprint/` (what the system is), `src/` (how it does it: for each thing a folder with its handlers, and later its contract and workflows),
  `generated/` (everything Architect builds, the server included). The one loose file is `architect.config.ts`.
  `spikes/` is never built.
- Two kinds of generated code: scaffolds, written once with blanks (`Blueprint.todo(...)`), then yours; and outputs,
  under `generated/`, rewritten every run and never edited. A handler is scaffolded only once its declaration has no blanks.
- Code says `Blueprint`, never `Architect`: `import { Blueprint } from "@architect/blueprint"`. The command is `architect`.
- Names come from paths and exports, never strings. Errors are `<Thing><Reason>`; the machine's refusal is
  `<Thing>Not<State>`, generated; events are `<Thing><PastTense>`; steps are `<thing>.<verb>.<step>`.
- Roles live in the thing they're scoped to. Nothing project-wide is a loose file: environments, journeys and starting
  worlds have a folder with one file each.
- The chain: the server implements the API; the SDK is built on the API; the CLI and the MCP server on the SDK.
- Better Auth is the default identity. Alchemy builds the infrastructure. Journeys are part of the blueprint and are
  written by a different agent from the builder.
- The portal is read only, apart from answering asks.

## Layers (proposed, accepted as the way forward)

1. Declare and call. 2. Prove and ship. 3. Reach out. 4. On chain. 5. Time. Later: indexers, more kits, Python, actors.
Only a layer's own primitives are decided before it starts; the rest wait in `plan.md`.

## Layer 1: declare and call

- Things, machines (moves may have several outcomes: `to: ["active", "exhausted"]`), events, errors with exit codes,
  roles, operations, reads (`Blueprint.read`, no handler), steps, budgets, idempotency (`idempotent: "request"`).
- Starting worlds seed by running declared operations (`run:`), not by writing rows.
- Nine built-in evals: answer shape, declared errors, machine path, events, who may call, steps, budget, coverage,
  explainability.
- **Where state lives** (proposed, backed by the Durable Object spike): each thing says its owner with `lives`: the
  database (D1, layer 1's default, with a version column generated from the machine), an actor (`lives:
  Blueprint.actor()`: a Durable Object per thing instance, owning its state in its own SQLite storage, with a generated
  lock of one permit around every move, an outbox to its index retried by alarm, and a timeout on the lock), or the
  chain (layer 4, with an in-between state while a chain call is in flight). The world is a Durable Object: registry,
  clock controller, front door, destroyed by its own alarm at expiry. Each organisation is a Durable Object holding the
  index of its things, built from their events; reads across things come from it; questions across organisations from
  an export to R2. Heavy processes (a local Anvil) run as benches: Cloudflare Containers owned by a Durable Object.
- **The database** (decided, Aaron, 16 November 2026): Cloudflare-native, all SQLite: D1, each Durable Object's own
  storage, R2 for exports. No Postgres, no Neon; Postgres could come later as a kit.
- **One runtime** (decided): Cloudflare, local runs in its own local runtime (Miniflare), with a seam for another host
  kept but unused.
- **The clock from day one** (proposed, backed by the clock spike): one clock per world; nothing reads the wall clock;
  every wait goes through a Timers service; all handler, workflow and keeper work is counted work, so the world knows
  when it's quiet; a lint rule bans plain sleeps in handlers; the world steps time like a simulation. Time moves arrive in M8 (K23).
- **Names** (decided, backed by the names spike): an operation's name is its path, an error's its exported class name;
  one compiler writes the only copy of each name into `generated/`; verb files keep their dashes (`change-role.ts`) and
  the compiler maps them to identifiers (Aaron, 16 November 2026).
- **Sign-in in layer 1** (decided, Aaron, 16 November 2026): a built-in Better Auth adapter, which becomes the auth kit
  in layer 3.

## Layer 2: prove and ship

- Every output has a destination per environment: deployed (server, MCP, portal, contracts, keeper) or published
  (SDK to npm; CLI to npm, Homebrew and GitHub releases). The MCP server is remote, with OAuth.
- Versions are worked out by comparing two compiled models: added is minor, a changed payload is major, a budget is a patch.
- Secrets are named per environment; values live only in the environment.
- Verdicts are made only by CI.

## Layer 3: reach out

- A standard library, `@architect/std`, of kits: each wraps packages that already exist behind a primitive Architect declares.
  Kits arrive finished, with no blanks; `architect add kit` writes one file of the project's choices; generate folds the
  kit's declarations into the model. A project never imports the wrapped package directly (lint).
- The chain kit: viem is the only real dependency. Contract services, transaction tracking, typed chain errors and
  typed-data signing are adapted (not depended on) from @prb/effect-evm (MIT, Effect 4); its browser parts are skipped.
  Simulation is a primitive: free through the node (`eth_call`, `eth_simulateV1`) or a forked local Anvil, with
  Tenderly as an opt-in kit. The relayer is an actor, so nonces go out in order.
- No hosted indexer and no Ponder: each thing's receipts are written through to its organisation's index, and a
  generated chain follower (one Durable Object per contract: alarm, checkpoint, chunked reads, a ring of recent block
  hashes, corrections) catches the rest. Its ideas are credited to effective-indexer (MIT).
- The wallets kit adds EIP-7702: a plain wallet delegated to smart-account code, without changing address.
- A dependency is something you call (its declaration adds errors and spans; the failure mapping is the one blank).
  An edge is where a framework calls you (generated; decodes with the blueprint's schemas; runs your Effect).
- Every boundary: one owner for the shape, types generated on both sides, a decode at the wire, a conformance test
  in the other side's runtime.

## Layer 4: on chain

- Solidity is a target, switched on by a thing living in a chain store (K25, 20 November 2026). Values say their Solidity type.
- Generated: the types, the compiled machine (`_step`), what each person signs (EIP-712 from each payload, with nonce
  and deadline), Foundry tests (every move from every state, wrong signer, replay), the contract scaffold with blanks,
  and the contract's Effect client from the ABI. The compiled contract owns its ABI.
- Signing: people sign with their own wallets (`signedBy: <role>`). The signer is a primitive; kits implement it:
  local key, browser wallet, test keys; later embedded wallets (such as Openfort) and smart accounts (such as Safe).
  Wallets are linked by Sign-In with Ethereum. The contract checks with OpenZeppelin's SignatureChecker, so a plain
  wallet and a smart account are checked the same way.
- A relayer from the standard library pays the gas and can't act alone. The server holds nobody's key.
- Reads come from the contract's own view. Indexers are later.

## Layer 5: time

Now its own milestone, M8, decided in [`decisions/K23-time.md`](decisions/K23-time.md): real, stepped and scaled
clocks; `s.clock` in journeys; calendar anchors; each system's hook; adapters that declare their clock.

- One clock per world: real, stepped or scaled. Moving a stepped clock moves the chain with it.
- Moves made by time: `every` or `after`, fired lazily or by the keeper (a built-in caller) within a `late` window.
- The keeper has its own key, limited by the contract to time moves. It fires through the world's Timers service:
  a grant sets the thing's own timer (a Durable Object alarm, or a row in a stepped world's timer table); no scans.
  A tenth eval: on time.
- Periods have an anchor: the allowance's monthly reset counts calendar months from the grant (Aaron, 16 November 2026).
- Long waits are durable workflows: each declared step a durable activity, `idempotent: "request"` as the workflow's key.

## Later

- Safe as its own kit (from Safe's ABI events and our own small core; Protocol Kit only in conformance tests; nothing
  from @prb/effect-evm-safe, which only covers Safe Apps); other kits; Python as a third target; migrations when states change; side-by-side versions
  once real callers exist; derivations.

## The agent harness (proposed, H1)

- A package of its own, `@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.): Pi Durable 1.5.0 behind an Effect seam, providers through `pi-ai` (Anthropic and Command Code), tools derived from the blueprint's operations, skills as a small extension, a copy-of-the-project tools-only sandbox first, Pi's telemetry exported through Effect's OTLP layer, run records scored by `check` and `prove`. Effect AI with Cluster/Workflow on Durable Objects is the named fallback. See `decisions/H1-agent-harness.md`; steps A1 to A7 in `build-plan.md`.

## Agent runs and internal benchmarks (proposed, H2)

- Check 4 becomes the first runner (`sdk`) of `@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.) at A0, with `oracle` and `null` runners that check the bench itself in
  CI with no key; Pi joins as the `pi` runner for open models. A run is one folder (a typed `record.json` of numbers and hashes,
  beside its transcript, spans, logs, output and score), kept as files now and in R2 and D1 at A6. Tasks are derived per project,
  operation and variant (`blank`, `isolated`, `repair`, `review`; 49 today), scored by `check` and `prove`; suites run under a daily
  spend ledger; baselines are small summaries committed from a clean `main`. See `decisions/H2-agent-runs-and-benchmarks.md`;
  steps A0, A8 and A9 in `build-plan.md`.

## The work system (proposed, F5)

- Missions, milestones, intake questions, agent runs and attention are an Architect project, `examples/work`, with its own
  blueprint; its CLI, SDK and MCP tools are generated. Tasks are worked out, never stored. Facts stay in the logbook.
  See `design/decisions/F5-work-blueprint.md`; it replaces F4's hand-written `Plan` Durable Object.
