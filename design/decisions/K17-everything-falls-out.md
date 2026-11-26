# K17: everything falls out, in every output, on every target, in every environment

Written 19 November 2026 by the conductor with Aaron. **Decided the same day:** the conductor took all four
recommendations (1A 2A 3A 4A) under "Who decides" in `AGENTS.md`, when Aaron cleared every open pull request to start
Goal 3. The questions stay below as the record, and Aaron can still overturn any of them. It widens K14's grid (PR #72) with the two axes it leaves out. The first is where the
code runs and in which language. The second is which environment it runs in. It builds on K16 (the scaffold explains
itself, PR #75) and K7 (chain languages).

## Aaron's words

> "Can we, I think this is our job, mine and yours now, to flesh out that meta thing, include all of these things here.
> I want a proposal, by the way, not just like loosely here … all of this stuff here should fall out. So I want you to
> explain how that would fall out in the different environments as well. Also, even though we're not going to build it
> all right now, but how it falls out in other languages like solidity as well."

Earlier the same day: "As long as this can all … fall out mechanically."

## In three sentences

Today every generator has TypeScript on Effect wired into it, and there is no seam for a second language. This proposal
names the four things that decide what falls out of a declaration: who it is for, what form it takes, where and in
which language it runs, and which environment it is bound to. Each gets one rule. A new output, language or
environment is then a plugin that follows the rules, never a special case.

## Where we are, read from the code

These findings come from `origin/m1` at `6419d4b7` and from `origin/main`, read in three research passes on 19
November and spot-checked. The builder of each slice re-reads its own lines.

- **One language, hard-wired.** No interface exists for a language to implement.
  - `packages/language-solidity/src/index.ts` is just `export {};`. Its README says it "arrives in layer 4".
  - Every renderer writes `.ts` text and imports `language-effect` (`api.ts:105`, `server.ts:66-68`,
    `scaffold.ts:73`, `mcp.ts:16`, `sdk.ts:42`).
  - Names follow TypeScript's rules (`projections/.../names/internal/names.ts:9-18`).
  - The compiler refuses `runs: "chain"`, because "this project's only language, language-effect, runs them all on
    the server" (`compiler/.../describe.ts:227-228`).
- **One seam, half used.** `Blueprint.projection` (`orthograph/.../plugins/types.ts:130-139`) is the plugin seam for
  outputs.
  - It knows nothing about languages: it has no `language` field.
  - Its hosts are `worker | node | browser | world`, with no chain.
  - Only model, api and server use it. Docs, portal, MCP, SDK, CLI and the scaffold are a fixed list in
    `generators/.../render/service.ts:20-29`. M1.12 and M1.13 already plan to move them onto the seam.
- **Declared, reaching nothing.** Blueprints declare these model fields, but no generator reads them, so they don't
  fall out yet:
  - `allowed` reaches no SDK, CLI or MCP output.
  - `idempotent` reaches no client: the SDK never sends a request key (`sdk.ts:23`).
  - `budget` reaches only docs and the portal, never the runtime.
  - `list` reaches only docs, and `via` only MCP.
  - `journeys` and starting worlds reach no output: the portal marks them unavailable (`portal/.../wire/service.ts:7`).
  - Of an environment's fields, only `name` and `lifetimeMs` reach a generator (`server.ts:148`). Its secrets, deploy,
    publish, stores, identity and telemetry reach none.
  - `StepModel.writes` and `OperationModel.test` reach nothing, and the machine's moves reach only docs.
- **The server runtime already pre-handles a lot** (`language-effect/.../handler/service.ts:34-130`). In order:
  1. Decode the payload.
  2. Check the role (`:60`).
  3. Replay a repeated request key (`:66-70`).
  4. Check the from-state (`move.ts:30-40`).
  5. Run the handler as counted work, with a span per step (`:74`).
  6. Check the answer (`:78-81`).
  7. Check the outcome (`move.ts:43-53`).
  8. Set the state and build the event (`move.ts:56-75`), keeping private fields out of the journal (`:70`).
  9. Make one commit with the writes, the journal and the request key (`:84-91`).
- **The device runtime pre-handles almost nothing** (`language-effect/.../handler/internal/device.ts:34-60`). It has no
  store, journal, role check, from-check, move or idempotency, and every caller is anonymous.
- **Chains are designed and spiked, not generated.** K7 worked out Solidity, Noir and Rust by hand on three local
  chains (`spikes/chain-languages/`). `packages/chain-evm` is real: Anvil, simulating before each send, and the event
  follower.
- **Environments bind very little.** An environment declares identity, cloud, stores, secrets by name, telemetry
  sinks, deploy and publish (`examples/acme/blueprint/environments/*.ts`). It has no chain endpoint, no confirmation
  depth and no adapter stand-in. The wallet hard-codes `depth: 1` (`wallets/.../submit/internal/flow.ts:29`).

## The four things that decide what falls out

What falls out of a declaration is fixed by four answers. Each answer comes from one place, and nothing else may change
what falls out.

| Axis | The question | Where the answer comes from | Example |
|---|---|---|---|
| **Audience** | Who meets it? | the block's kind, through K14's audience rule (one framework table) | a step is for the builder and the operator, never the caller |
| **Output** | In what form? | the output's projection | an SDK function, CLI command, MCP tool, docs page, portal view or span |
| **Target** | Where does it run, and in what language? | the operation's `runs` and its thing's store kind | the server in TypeScript on Effect; the device; an EVM contract in Solidity |
| **Environment** | What is it bound to? | the environment file | `api.staging.acme.dev`, D1, Anvil at depth 1, the Axiom sink |

The rules:

1. **The audience decides whether** a block reaches an output. That is one table (K14), not a list of greyed-out
   cards.
2. **The output decides the shape** that the caller, builder or operator sees, and the shape is the same on every
   target. An SDK function looks the same whether it calls a Worker over HTTP, runs on the device, or sends a
   transaction.
3. **The target decides the code behind it.** That covers the frame it generates, the blanks it scaffolds, what it
   enforces before and after the body, and how a refusal travels on its wire.
4. **The environment decides only bindings.** That means where, with which keys, at what confirmation level, and
   against the real service or a stand-in. It never changes a shape, a name, a code or a contract. The store rule
   already says so: "Not chosen per environment. The kind is in the model … Only the binding changes"
   (`docs/canon/stores.mdx:274`).

## The one structural change: a target is a plugin (superseded by K27, 20 November 2026: no target; a language and a host, each a plugin kind)

K5 already says what a language owns: "the frame, the blanks, the enforcer's meaning and the clients written in it"
(`K5-the-whole-shape.md:509-516`). The proposal makes that an interface. `language-effect` is its first
implementation, and `language-solidity` will be its second.

```ts
// packages/orthograph (proposed): what every target implements
export interface TargetSpec {
  readonly name: string;                                  // "effect", "solidity", "noir", "anchor"
  readonly hosts: ReadonlyArray<Host>;                    // worker | node | browser | world | chain:evm | chain:aztec | chain:solana
  readonly takes: (op: OperationModel) => boolean;        // runs: "server" → effect-server; runs: "client" → effect-device; an evm store → solidity
  readonly frame: (op: OperationModel) => Output[];       // generated, "Do not edit": the wrapper that runs the guards
  readonly scaffold: (op: OperationModel) => Output[];    // "Yours from now on": K16's header and blanks, in its language
  readonly guards: Record<Guard, "enforced" | "pre-checked" | "not-applicable">;   // see the guard table
  readonly wire: "http" | "device" | "chain";            // how the one SDK reaches it
  readonly refusal: (code: RefusalCode) => WireIdentity; // K7's refusals.lock: a code becomes a selector, a number, an assert text
  readonly surface?: (model: Model) => Output;           // chain targets: generated/<language>/surface.json (K7:155-161)
}
```

The SDK, CLI, MCP, docs and portal are generated once, from the model plus each target's `wire` and `surface`, never
from a chain's ABI or IDL (K7:150-161). That makes "the same SDK function, whatever runs it" true by construction.

**A target is a place plus a language, not a language.** One language can serve several targets. `language-effect`
provides two instances: `effect-server`, on the wire `http`, and `effect-device`, on the wire `device`. They share their
frame, scaffold and refusal code, and differ in `takes`, `hosts`, `wire` and `guards`. A device operation runs
in-process with no store or move, so its guards can't be the server's. Each operation is taken by exactly one target:
the compiler refuses an operation that no target takes, or that two targets take. So the SDK reads `wire` from the one
target that took the operation, and device operations keep calling `Device.serve`. (Corrected 19 November 2026 after
review: the first sketch gave one Effect target `wire: "http"` for every non-chain operation, which would have sent
device operations over HTTP.)

## The guards: what every target pre-handles, in one order

K7 fixed the order of checks on a chain: role, then machine, then body (K7:336-341). The server runs the same order.
The proposal makes the guards a named, ordered list that every target implements. The scaffold's header (K16) prints
that list for its target, so the developer can read exactly what is already done for them.

Aaron's pre-handling list from 19 November is part of this table. The subject is preloaded, not-found is generated,
new ids are minted, event fields are enforced by the answer's type, exit codes are carried through, journey stubs are
made per error and per role, and visibility is shown in the header. For the Effect target, K16 places all seven in M1, and Gate M1 needs them. They are split across five slices:
- M1.44: the scaffold, with visibility in the header.
- M1.45: journey stubs per machine path, per error and per role.
- M1.46: the subject and referenced things handed in, the generated `NotFound` (exit 4, HTTP 404), and minted ids.
- M1.47: one refusals table of code, exit and status, read by the CLI, HTTP and MCP.
- M1.48: the compiler refuses an event field that nothing supplies.

| # | Guard | Server (Effect) | Device | EVM (Solidity) | Aztec (Noir) | Solana (Anchor) |
|---|---|---|---|---|---|---|
| 1 | decode the payload | enforced (`InvalidPayload`) | enforced | ABI decode | enforced by the PXE | enforced by Anchor |
| 2 | load the subject and anything the payload names by id, handed to the body (M1.46) | proposed | n/a (no store) | storage read | note read on the device | the account list |
| 3 | not found, generated (M1.46) | proposed where no role check read the subject, and for ids the payload references; on a role-gated call a missing subject is refused `NotAllowed` (`access/service.ts:54-55`, `:83`), which hides whether it exists, and that stays | n/a | generated `require` | pre-checked on the device | the account must exist (K7:364-366) |
| 4 | mint the id for a creating move (M1.46) | proposed; today `Ids.of` by hand (`grant.ts:20`) | n/a | counter or hash | note nonce | PDA seeds |
| 5 | role | enforced (`:60`) | **not enforced today** | generated modifier (K7:622-625) | private note, on the device (K7:121-123) | signer plus member account |
| 6 | replay a repeated request key | enforced (`:66-70`) | not enforced | nonce or `BySig` digest | the one-use claim | durable nonce |
| 7 | from-state | enforced (`move.ts:30`) | n/a | generated `require(state)` | later in the block (K7:340-341) | in the instruction |
| 8 | the body | the developer | the developer | the developer | the developer | the developer |
| 9 | answer shape, and every event field fillable (M1.48) | the shape enforced (`:78-81`), so a declared answer field can't be forgotten; the compiler doesn't yet check that an event's fields can be filled, which today is caught only at commit (`move.ts:65`) | enforced | return decode | proof output | instruction return |
| 10 | the outcome is a declared `to` | enforced (`move.ts:43-53`) | n/a (`move` is a no-op) | generated | generated | generated |
| 11 | state and event | enforced (`move.ts:56-75`) | n/a | `emit` | public log | `emit_cpi!` |
| 12 | one commit | enforced (`:84-91`) | n/a | the transaction | the transaction | the transaction |
| 13 | confirmed | immediate | immediate | the follower, at the environment's depth (K7:241) | `proven` | `confirmed` |
| 14 | a refusal carries one code on every wire | one generated refusals table read by the CLI, HTTP and MCP (M1.47) | exit code | custom error by selector | assert text | error number |

Some chains can't enforce a guard first: on Aztec the machine runs late, and Anchor checks accounts before the body.
There the generated client runs the pre-checks in this order before sending, and every send is simulated first
(K7:359-363). That keeps one refusal with one code, whichever target refuses.

## How each building block falls out

- **Generated** means "Do not edit": the file is rewritten every time.
- **Scaffold** means written once, then the developer's.
- **Binding** is what the environment changes.
- **Today** means what `m1` does. Everything else is proposed, or designed in the record named.

**Thing and fields.**
- Server: a table in the thing's store (D1).
- Device: none.
- EVM: contract storage.
- Aztec: public storage plus private notes.
- Solana: one account per instance, from seeds.
- Every target: the SDK type for the thing (M1.42), and the docs and portal card.
- Binding: which database or chain address holds it. Fields and types never change.

**Operation and read.**
- Server: one route and one handler.
- Device: `Device.serve` in the generated client (`sdk.ts:33-57`).
- EVM: one external function, plus `<op>BySig` when a member signs.
- Aztec: a private entry and a public continuation.
- Solana: one instruction and its account list.
- Every target: one SDK function, one CLI command, one MCP tool, one docs page, one portal page and one span.
- Should fall out but doesn't yet: `allowed`, `idempotent` and `budget` in the clients. That means who may call in the
  help text, a request key sent by default, and the budget as a span attribute the portal checks.

**Step.**
- Server: a span per step (today).
- Chain: a call into another program is a declared step with its one refusal (K7:199-209).
- Scaffold: one section per step (K16).
- Never reaches the caller (audience).

**Machine.**
- Server: the from-check, the outcome check and the event (today).
- Chain: the machine compiled into the contract (K5:297-299).
- Scaffold: the transition table, and `Match` over the endings, so adding an ending stops the handler compiling (K16).
- Journeys: one stub per allowed and per refused move (K16).
- Docs and portal: the lifecycle strip.

**Event.**
- Server: journalled in the commit (today).
- EVM: a log.
- Aztec: a public log; private events go to their recipients only.
- Solana: `emit_cpi!`.
- Every target: the SDK exports its type (M1.42), and the answer's type must carry the event fields only the answer
  can supply (K16).
- Binding: on a chain, `confirmed` waits for the follower at the environment's confirmation level.

**Error and refusal code.**
- One code per declared error, across every wire, all from one append-only `refusals.lock` (K7:344-349): an HTTP
  status, a CLI exit code, an MCP error, an EVM custom error by selector, a Solana error number, an Aztec assert text.
- Scaffold: one refusal block per error, with its fields (K16).
- Journeys: one stub per error (K16).

**Roles.**
- Server: checked before the handler (today).
- Device: not checked today. This is a gap, either to close or to state openly.
- EVM: a generated modifier.
- Aztec: a private membership note.
- Clients: who may call, in the SDK's doc comment and the CLI's help (M2.03).
- Journeys: one allowed caller and one refused caller per role (K16).
- Binding: who can be a caller. That is test principals locally, and Better Auth in staging and production.

**Field visibility.**
- Server: filtered per audience and kept out of the journal (M1.35, `move.ts:70`).
- Scaffold header: which fields are private or secret, and who sees them (K16).
- Aztec: private notes, proved on the device.
- EVM: everything on a chain is public, so a private field on an EVM store is refused at compile time (Q3).
- Telemetry: an allowlist built from visibility.
- Never changes per environment.

**Environment.**
- Falls out as:
  - the domains the clients and docs name (K14 Q4);
  - the server's bindings (M7.03);
  - the telemetry sink;
  - the confirmation level per chain;
  - which adapters run against a stand-in.
- Today only `name` and `lifetimeMs` reach a generator.
- Proposed additions to the environment file (see Q4):
  - `chains`: endpoint, chain id and confirmation level;
  - `adapters`: stand-in or real.

**Store.**
- Server: D1 per store.
- Chain: `chain.evm`, `chain.aztec` and `chain.solana`, with their capabilities (K7:275-283).
- A store answers a commit at once on the server, or late, as a submission, on a chain (K7:77-78).
- Binding: the database or the deployed address.
- One call commits to one store; anything wider is a workflow (K3). (Superseded by K46, 26 November 2026: anything wider is more than one call, joined by an event.)

**Mount, adapter and plugin.**
- A plugin's operations fall out like the app's own, with `from` naming the plugin.
- Another party's contract is a source reached through an adapter typed from its ABI, IDL or artifact, never a store
  (K7:194-211).
- Binding: stand-in or real (`Stand.process`, `Stand.vendor`, `Stand.none`; `design/frame/adapters.md:167`).

**Runs on the device.**
- Today the generated client runs it in-process and anonymously, with no store or move.
- On Aztec, the private half runs in the caller's prover, and the server never sees the inputs.
- Falls out as the same SDK function as a server operation.

**Journey.**
- Today `prove` runs it against the server over HTTP, per environment (`prove --env`).
- Proposed:
  - run through each client (M2.08);
  - run on every target's local world: Anvil, the Solana validator, Aztec's in-process network (K7);
  - scaffolded from the machine, the errors and the roles (K16).
- Binding: the world it runs in, never the journey itself.

**The portal.** The portal reads the same model through the same audience rule, so each block reaches a portal page
the same way it reaches docs. M1.13 builds it on the agreed design (`design/portal.md`, M1.25). The pages not yet
drawn are the ones for blocks the design doesn't cover:
- environments, stores, mounts and plugins;
- journeys and worlds;
- roles and errors;
- and, later, chain targets.

## How it falls out per environment

The environment changes bindings only. For each output:

| Output | What the environment binds | Today |
|---|---|---|
| API and server | domain, database, worker bindings, secrets | one local `wrangler.jsonc`; M7.03 generates one stack per environment |
| SDK and CLI | the base URL for each named environment, sign-in | a URL from `ACME_URL`; `--env` names only a session (K14 Q4) |
| MCP | its domain | nothing |
| docs | an environments page: domains, identity, sinks, promotion | none (proposed in M1.13) |
| portal | one portal per environment, reading only its own sink, with a switcher | the wire drops everything but name, runs, promotion and lifetime |
| telemetry | the sink | `deployment.environment` is on every span; the per-call `environment` attribute is red (check 17, M1.36) |
| chain | endpoint, chain id, confirmation level, verified or mock proofs | not in the environment type; the wallet uses depth 1 |
| adapters | stand-in or real | chosen in the adapter's own declaration, not per environment |

A check is proposed for the story check (K14). Generate every environment, and assert that every output's shape
(types, names, codes, routes) is byte-identical across them, apart from the binding files.

## How we would build it, in order

Nothing here starts outside its milestone. On the critical path, K16 comes first (the scaffold and Aaron's
pre-handling list), then:

1. **The target interface, with one implementation.** (Superseded by K27, 20 November 2026: the language and
   host seam, Goal 4's first slice.) This fits M1.12 and M1.13, which already move renderers onto projections.
   It means `TargetSpec` in `orthograph`, `language-effect` implementing it, and the guard list printed by the
   scaffold. Done when the existing outputs come out byte-identical through the new seam. No new language yet.
2. **Fields declared but reaching nothing**, wired up:
   - `allowed`, `idempotent` and `budget` into the clients (M1.42 and M2.03);
   - journeys into the portal (M1.13);
   - environment details into docs and the portal (M1.13).
3. **The environment file gains `chains` and `adapters`** (Q4). The wallet (M1.38) reads its depth from there instead
   of the hard-coded `depth: 1`.
4. **Solidity as the second target** (M6, layer 4):
   - a generated contract for each thing on an EVM store;
   - the frame running guards 2 to 12;
   - the scaffold in Solidity, with K16's header;
   - `refusals.lock` and `surface.json`;
   - the same SDK.
5. **Noir and Anchor** (stage 4 and later), each a `TargetSpec`.

The grid (K14) gains one set of rows for the guards and keeps its nine columns. Each target gets its own copy of the
grid when it arrives (Q1), so the board shows "Solidity: 0 of N green" beside "Effect" without mixing them.

## Questions for Aaron

**Terms for this round.**
- A **target** is where an operation's code runs and in which language. Today there are only the server and the
  device, both in TypeScript on Effect.
- A **guard** is a check or step the framework does around your handler, so you never write it.
- A **binding** is what an environment changes: a domain, a database, a key, a chain endpoint.
- The **grid** is K14's 13 building blocks by 9 outputs.

### Q1 — How does the grid show other targets?

**The problem, in code.** The grid has one cell per block and output, and today every cell means TypeScript on Effect:

```jsonc
// design/grid/grid.json (PR #72)
{ "id": "machine.sdk", "block": "machine", "output": "sdk", "state": "red" }   // no target in the id
```

Why it matters: if nobody decides, then the day Solidity arrives a green `machine.sdk` card becomes ambiguous. It is
green for the server and red for the contract.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `design/grid/types.ts` | the cell id and the board's join key |
| the mission board | lanes, scores and the climb |
| the story check (K14) | which cards it evaluates per target |

**The options**

**Today:** one grid, implicitly TypeScript.

**A · One grid per target, same rows and columns** (recommended)
```jsonc
{ "id": "effect:machine.sdk", "target": "effect" }
{ "id": "solidity:machine.sdk", "target": "solidity", "state": "red" }   // added when M6 starts
```

**B · A third axis in one grid**
```jsonc
{ "id": "machine.sdk", "targets": { "effect": "built", "solidity": "red", "noir": "red" } }
```

**C · Leave it until a second target exists**
```jsonc
{ "id": "machine.sdk", "state": "built" }   // every id renamed when Solidity lands
```

**You do X → what happens**

| Scenario | A · Grid per target | B · Third axis | C · Later |
|---|---|---|---|
| You open the board today | the same cards, labelled Effect | the same cards, each with one target dot | the same cards |
| Solidity starts | a second grid appears, all red | every card gains a red dot | every id is renamed |
| You ask "is the machine lane done?" | answered per target, unambiguously | you read the dots | ambiguous |

**Rubric**

| Axis | A · Per target | B · Third axis | C · Later |
|---|---|---|---|
| Floor-first | ✅ a prefix now | ⚠️ a new shape now | ✅ nothing now |
| Reversibility | ✅ | ⚠️ | ❌ ids change later |
| Blast radius | ✅ ids only | ⚠️ every view | ❌ every reference |
| Correctness | ✅ one meaning per card | ⚠️ one card means several things | ❌ |
| Fit | ✅ a target is a plugin, and so is its grid | ⚠️ | ⚠️ |

**Recommendation: A.** The id gains a target prefix now, while PR #72 is still open, so nothing has to be renamed
later.

### Q2 — When does the target interface land: now in M1, or with Solidity in layer 4?

**The problem, in code.** Every renderer writes TypeScript directly:

```ts
// packages/projections/src/modules/handlers/internal/scaffold.ts:73
`import { Handlers } from "${Names.pkg("language-effect")}";`,
```

Why it matters: K16 is about to rewrite the scaffold. If it is rewritten for TypeScript only, it gets rewritten again
for Solidity.

**What it touches**

| Dependent | Why it cares |
|---|---|
| K16's scaffold | written once against the interface, or written twice |
| M1.12, M1.13 | they already move renderers onto `Blueprint.projection` |
| `language-solidity` | the second implementation |

**The options**

**Today:** no interface exists, and `language-solidity` is just `export {};`.

**A · The interface now, with one implementation** (recommended)
```ts
// language-effect: one language, two targets, sharing frame, scaffold and refusal
export const effectServer: TargetSpec = { name: "effect-server", hosts: ["worker", "node", "world"],
  takes: (op) => op.runs === "server", frame, scaffold, guards: serverGuards, wire: "http", refusal };
export const effectDevice: TargetSpec = { name: "effect-device", hosts: ["browser", "node"],
  takes: (op) => op.runs === "client", frame, scaffold, guards: deviceGuards, wire: "device", refusal };
```

**B · With Solidity, in layer 4**
```ts
// K16 writes TypeScript directly; layer 4 extracts the interface from two working targets
```

**You do X → what happens**

| Scenario | A · Now | B · Layer 4 |
|---|---|---|
| K16's scaffold | written once, through `scaffold(op)` | written in TypeScript, then extracted later |
| Solidity starts | you implement one interface | you design the interface and port K16 |
| The interface turns out wrong | found with one example; cheap to change | found with two examples |

**Rubric**

| Axis | A · Now | B · Layer 4 |
|---|---|---|
| Floor-first | ⚠️ a seam with one user | ✅ nothing extra now |
| Reversibility | ✅ an internal interface | ✅ |
| Blast radius | ⚠️ every renderer touched once | ⚠️ every renderer touched later |
| Correctness | ✅ "falls out" holds by construction | ⚠️ TypeScript assumptions harden |
| Fit | ✅ K5's language boundary, M1.12's move | ⚠️ |

**Recommendation: A**, kept small: just the interface, with `language-effect`'s two targets behind it and the outputs
coming out byte-identical, device operations included. It rides on M1.12 and M1.13, which already touch every renderer.

### Q3 — A private field on a public chain: refuse it, or allow it with a warning?

**The problem, in code.** Visibility is declared per field, but on an EVM chain anyone can read contract storage:

```ts
Blueprint.thing({ fields: { balance: Blueprint.field(Amount, { visibility: "private" }) } })
// lives on an evm store: the "private" balance is public on chain
```

K7 says a store kind refuses what it can't serve, and that only Aztec has `private` (K7:279-283). It never says so
for visibility.

Why it matters: without a rule, "private" silently means "public" on EVM.

**What it touches**

| Dependent | Why it cares |
|---|---|
| the compiler's store checks | where the refusal would live |
| M1.35 (visibility) | the one rule every output calls |
| stage 4 (Aztec) | the case where private works |

**The options**

**Today:** no chain stores are generated, so nothing checks this.

**A · Refuse it at compile time** (recommended)
```bash
ortho generate
# balance is private, but Balance lives on chain.evm, where every field is public. Move it to chain.aztec or a database store.
```

**B · Allow it, with a warning and a "public on chain" mark in docs and the portal**
```bash
ortho generate
# warning: balance is private but stored publicly on chain.evm
```

**You do X → what happens**

| Scenario | A · Refuse | B · Warn |
|---|---|---|
| You mark a chain field private by mistake | it stops you | it ships, publicly readable |
| You want a private field next to a public contract | keep it in a database store beside it | the same, or ignore the warning |

**Rubric**

| Axis | A · Refuse | B · Warn |
|---|---|---|
| Floor-first | ✅ one compiler check | ✅ |
| Reversibility | ✅ easy to loosen later | ❌ the data is already public |
| Blast radius | ✅ | ❌ a leak |
| Correctness | ✅ the promise holds | ❌ "private" means nothing |
| Fit | ✅ K7's capability rule | ⚠️ |

**Recommendation: A.** A refusal can be loosened later; a leak can't be taken back.

### Q4 — Does the environment file declare chains and adapters?

**The problem, in code.** An environment declares identity, cloud, stores, secrets and sinks, but no chain:

```ts
// examples/acme/blueprint/environments/staging.ts:3-12 (abridged): no chain, no confirmation level
identity: Identity.betterAuth, cloud: Cloud.cloudflare({ database: Cloud.d1() }),
```
```ts
// packages/wallets/.../submit/internal/flow.ts:29
depth: 1   // right for Anvil, wrong for a testnet or production (K12)
```

Why it matters: without a home for chain bindings, every chain plugin hard-codes them, and staging and production
disagree silently.

**What it touches**

| Dependent | Why it cares |
|---|---|
| the wallet (M1.38) | it reads the depth |
| K7's `confirmed` | defined per environment and per chain |
| adapters (stand-in or real) | today chosen in the adapter, not the environment |

**The options**

**Today:** no chain or adapter fields on the environment; the wallet uses `depth: 1`.

**A · `chains` and `adapters` in the environment file** (recommended)
```ts
// blueprint/environments/staging.ts
chains: { base: Chain.evm({ id: 84532, rpc: Secret("BASE_SEPOLIA_RPC"), confirmed: "safe" }) },
adapters: { stripe: Adapter.real, mail: Adapter.standIn },
```

**B · Chains in each plugin's settings** (`Blueprint.setting.list`, `writing-a-feature.md:265`)
```ts
wallets: { chains: Setting.perEnvironment({ local: [31337], production: [8453] }) }
```

**You do X → what happens**

| Scenario | A · Environment file | B · Plugin settings |
|---|---|---|
| You add staging on a testnet | one line in `staging.ts` | a line in each plugin that touches the chain |
| The portal shows what staging runs against | read from one file | gathered from the plugins |
| Two plugins use the same chain | one declaration | two declarations, which can disagree |

**Rubric**

| Axis | A · Environment | B · Plugin settings |
|---|---|---|
| Floor-first | ✅ the wallet stops hard-coding depth | ✅ |
| Reversibility | ✅ | ✅ |
| Blast radius | ✅ the environment type and the wallet | ⚠️ every chain plugin |
| Correctness | ✅ one place, one answer | ⚠️ can disagree |
| Fit | ✅ "the environment decides bindings" | ⚠️ |

**Recommendation: A.** One place holds each binding, which is the fourth rule.

### At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | How the grid shows other targets | A · one grid per target, ids prefixed now |
| Q2 | When the target interface lands | A · now, with one implementation, riding on M1.12 and M1.13 |
| Q3 | A private field on a public chain | A · refused at compile time |
| Q4 | Chains and adapters per environment | A · declared in the environment file |

**Decided:** 1A 2A 3A 4A, by the conductor on 19 November 2026. PR #72 merged first, so the target prefix from Q1 is
added when Goal 3 grades the grid again.
