# K5: the whole shape

Written 18 November 2026 by the building agent, and revised the same day with Aaron's decisions.

This record holds the whole of Orthograph on one page: every primitive, every seam, who owns it and what crosses it.
The details stay with the canon's layers. Where Aaron's decisions disagreed with the first version, they won. The
first version had agent-native running the app, with its own Postgres and an auth bridge. That is gone: we port what
we need from agent-native, and nothing of theirs runs. K2 still stands; where this record refines it, K2 carries a
note pointing here.

**Names.** The framework is now **Orthograph**, with the command `ortho` and the npm scope `@orthograph` (K6, PR #42).
"Blueprint" stays as the name of what you write. The code on `main` still says `forman` and `@formants` until the
rename sweep. This record writes Orthograph in prose and cites code by today's paths. The `@orthograph` org exists on
npm.

## Aaron's words and decisions

On 18 November, opening this work:

- "it definitely shouldn't be two things. It should be one thing."
- "The whole thing has got to be thought about together … the overall thing … has to all be making sense now."
- "What about languages? … What are the actual primitives generally like plugins, adapters? How does data …"

His decisions from the Orthograph DX discussion, carried here as they were given:

1. **Orthograph is the framework people use to build their own apps.** Those apps use the generated SDK, CLI, MCP tools
   and actions. **The portal is the builder's place to understand and plan with the running system.** We build our own
   portal template on Orthograph. Sharpened by Aaron the same day: "we're going to keep the agent native shapes of
   actions, and reuse the templates, but we're going to make them our own so we can break compatibility with agent
   native if necessary." Then, sharper still: "I think we should drop Agent Native totally, right? Let's learn from it
   … they've got all the foundational bits that we need to make this work really well. We just need to port it … make
   it as compatible as possible. But our own thing … So we don't have to deal with this PG light and all this other
   type of stuff. And their MCPs and our MCPs are just our stuff." So **we port, we don't fork**: the pieces we need are
   rewritten into our own packages under our rules ("Porting from agent-native" below). The portal itself still needs
   designing, with agent-native's templates as the reference. And
   later: "we're going to be able to power agent native apps. But we're a different thing altogether … we want to do
   durable agents in the first place so we want to use a different stack anyway." So our actions keep agent-native's
   shape so that an agent-native app can use them, and the portal's agent is one of our own durable agents (M4).
2. **The portal keeps the intent from PR #41's direct feedback** (`spikes/generated-app/design/UX.md` at `c0f0abd`).
   - It starts with things and their lifecycles, then shows operations, machines, events, errors, and the notes
     attached to their thing.
   - It shows the declared behaviour, and live evidence lights up that same structure.
   - The portal gives context for planning. Separate plans and factory surfaces are parked (the work board returns as a portal extension: [K11](K11-work-board.md)).
   - PR #39's telemetry findings are research for the one portal.
   - The skills proposal (PR #37) is parked.
3. **An action is a generated, app-facing primitive derived from an operation.** It can bind to a screen or an agent
   tool, and it uses the SDK. The underlying operation keeps its authority.
   - A Solidity contract may have helper or ABI functions outside the generated app surface.
   - Open: the exact interface that maps a declared operation to an ABI entry and to deliberate client exposure. Aaron:
     this concerns only our own contracts. Other people's contracts are sources, reached through adapters (K3 item 8).
4. **Steps and workflows are different.** On `main`, an operation may already declare no steps.
   - A named step is a span inside one attempt of an operation, and the handler chooses which steps run.
   - A durable workflow's activity or wait records a run's progress across attempts and across owners.
   - Open: the exact workflow declaration, wake-up, deduplication and replay.
   - Today a domain event comes only from a machine's move. An operation-level `emits: DraftEdited`, for a successful
     edit with no machine, was a proposal. Aaron settled it as Q5: "B, on the operation" (see "Forks for Aaron").

## In one breath

**You describe a system once. Each operation is enforced in exactly one place: the Worker's wrapper for an Effect
operation, or the contract for a chain operation. Everything else falls out of the model and reaches that one place:**
- the SDK, the CLI, MCP tools and actions, for the apps people build;
- the portal, for the builder who needs to understand the running system.

Live evidence comes back under the model's names and lights up the same structure the portal draws from the
declaration.

## The picture

```text
                ┌──────────────────── the blueprint (what the developer writes) ────────────────────┐
  plugins ─────▶│ things · machines · operations · reads · roles · events · errors · steps         │
  feature,      │ stores · workflows · journeys · starting worlds · environments · secrets          │
  adapter,      └───────────────────────────────────┬───────────────────────────────────────────────┘
  projection                                        │ ortho check (the compiler)
                                                    ▼
                          the model: one JSON, every declaration hashed, the uses graph
                                                    │
               ┌─────────────── languages: frames, blanks, the enforcer for each place ──────────┐
               │ language-effect: the wrapper on the Worker (decode · role · span · replay ·     │
               │   machine · handler and steps · answer · commit), the TypeScript SDK            │
               │ language-solidity: the contract (machine, roles, refusals compiled in), its ABI │
               │ language-noir (later): private state, proofs made on the member's device         │
               └───────────────┬─────────────────────────────────────────┬────────────────────────┘
                               ▼                                         ▼
          host-cloudflare: Worker, D1, Durable Objects         Host.chain: EVM (Aztec later)
          the served operation                                  the contract function
                               ▲                                         ▲
                               └──────────── the generated SDK ──────────┘
                     (caller, request key, typed refusals, wallet submission and confirmation)
                         ▲            ▲             ▲               ▲
                       CLI       MCP tools       actions        the portal's "Try it"
                                              (screens, agent tools,
                                               in the apps people build)
                                                    │
     evidence: spans, step signals, journal events, chain receipts and events, under model names
                                                    ▼
          the portal: things and lifecycles first, then operations, machines, events, errors, notes;
          live evidence lights up the declared structure ─── proof: evals, verdicts, the logbook
```

## The worked example: the community workshop

This record's example is a small DAO for a community workshop. Members edit drafts together, put a frozen revision to
a vote, and publish the result. It needs every seam: two stores, two languages, a cross-owner workflow, a wallet and,
later, private membership. Signup's `sheet.join` is used only where the smallest case is clearer.

- **D1 holds** the editable draft text and the frozen publication revisions.
- **One governance contract owns** proposal state, member eligibility, one vote per member and the tally.
- **Editing a draft** is an Effect operation.
- **Voting** is a single contract operation. The contract enforces it, whether the call comes through the TypeScript
  SDK, the CLI or a generated action.
- **Publishing** is the cross-owner workflow:
  1. freeze the D1 revision;
  2. the member approves the wallet call;
  3. observe the confirmed contract event for the expected proposal and digest;
  4. link it back to the exact revision.
- **Later, on Noir:** private membership credentials with a public tally.
- **Governance is the reusable feature.** A forum integration is the example of an adapter.

The blueprint, in brief. It is a sketch in today's API, except where a line says `new`: those don't exist yet. The
chain parts follow `frame/examples/allowance-on-chain.md`.

```ts
// blueprint/things/draft/thing.ts: lives in the default store (D1)
export const Draft = Blueprint.thing({
  description: "Text members are working on, before it is put to a vote.",
  fields: { id: Blueprint.id("drf"), author: Person.fields.id, title: Title, body: Body, version: Version },
});

// blueprint/things/revision/thing.ts: also D1; frozen once made
export const Revision = Blueprint.thing({
  description: "A frozen copy of a draft: the exact text a proposal is about.",
  fields: { id: Blueprint.id("rev"), draft: Draft.fields.id, body: Body, digest: Digest, proposal: Blueprint.optional(ProposalId) },
});

// blueprint/things/proposal/thing.ts: lives on chain, in the governance contract
export const Proposal = Blueprint.thing({
  description: "A question put to the members, decided by one vote each.",
  fields: { id: ProposalId, digest: Digest, yes: Votes, no: Votes, closesAt: Blueprint.time() },
  lives: Blueprint.chain({ contract: "Governance", per: "workshop" }),   // new: M6.10, shape from K7; superseded by K25, 20 November 2026: a chain store file
});

// blueprint/things/proposal/machine.ts
export const machine = Blueprint.machine(Proposal, {
  states: ["open", "passed", "failed"],
  moves: {
    open:  { from: [], to: "open", emits: ProposalOpened },
    vote:  { from: ["open"], to: "open", emits: VoteCast },
    close: { from: ["open"], to: ["passed", "failed"], emits: ProposalClosed },
  },
});
```

## The seams

At each seam, four questions are answered:
- what the developer writes;
- what falls out;
- who enforces it;
- what the portal can show as evidence.

### 1. The description and the model

```ts
// blueprint/things/draft/verbs/edit.ts
export default Blueprint.operation(Draft, {
  description: "Change a draft's text.",
  payload: { draft: Draft.fields.id, body: Body, version: Version },
  answer: { version: Version },
  errors: [DraftChanged],            // someone saved first: reload and try again
  allowed: [author],
  steps: { load: Blueprint.step.database(), save: Blueprint.step.database({ optional: true }) },   // new: optional, M1.26
  emits: DraftEdited,                // new: Q5, built in M3.16
  idempotent: "request",
});
```

- **Writes:** one declaration per file, named by its path.
- **Falls out:** the model: every declaration hashed, the uses graph, and (from M1.03) journeys, starting worlds, role
  rules and blanks. Today the model holds only refusals, values, things, operations, blanks and environments
  (`packages/compiler/src/modules/model/internal/describe.ts:162`).
- **Enforced by:** `ortho check`, against the model's own rules: names from paths, one store per commit (K3),
  `runs` only where a language can run it.
- **Portal shows:** the declaration itself, drawn from the model on every view, with prose pinned to its hash and
  flagged when the hash moves.

### 2. Things and stores

- **Writes:** a thing, and `lives` when it is not in the default store.
- **Falls out:** migrations per store (K3 item 6), the data map, and each store's kind in the model.
- **Enforced by:** the store's commit. D1 commits with a version column. The contract commits per transaction, with
  one writer.
- **Portal shows:** the thing's page, starting with its lifecycle (the machine), then its operations, events, errors
  and notes. A store's binding shows per environment.

A chain is a host. The store kind that runs on it is `chain`, supplied by `language-solidity` (K3 item 2) (superseded by K27, 20 November 2026: supplied by `Host.chain`, written for by `language-solidity`). "Pending
until mined" belongs to the caller (superseded by K7, 18 November 2026: a chain store's own commit may answer late, with a submission), so a server call that sends a transaction is a workflow (seam 6).

### 3. An Effect operation: editing a draft

**What the scaffold writes.** `ortho` writes the handler once, as a real function, already wired. Each declared step
is in place, in declared order (the order eval 6 checks, `packages/prove/src/modules/evals/internal/calls.ts:114`).
The move is in place when one is declared, and so is a stub for each declared refusal. Every hole is a
`Handlers.blank`, so the file compiles, and `ortho prove --empty` names the reached blank on each red journey step
(M1.16). M1.26 wires those calls in the generated scaffold. The example below shows how the draft's handler can
name those holes.

```ts
// src/draft/edit.ts. Scaffolded from blueprint/things/draft/verbs/edit.ts. Yours from now on.
const edit: Handler = ({ draft, body, version }, { steps }) =>
  Effect.gen(function* () {
    const loaded = yield* steps.load(Handlers.blank<Draft>("load: read what this step needs"));
    if (yield* Handlers.blank<boolean>("refuse DraftChanged when?"))
      return yield* new DraftChanged(yield* Handlers.blank("DraftChanged's fields"));
    yield* steps.save(Handlers.blank("save: write what this step changes"));   // optional: may be skipped
    return yield* Handlers.blank<Answer>("the answer");
  });
```

**What the developer writes.** The developer fills the blanks:

```ts
// src/draft/edit.ts, filled
const edit: Handler = ({ draft, body, version }, { steps }) =>
  Effect.gen(function* () {
    const current = yield* steps.load(Drafts.get(draft));
    if (current.version !== version) return yield* new DraftChanged({ draft, version: current.version });
    if (current.body === body) return { version };                              // unchanged: no save, no event
    yield* steps.save(Drafts.put({ ...current, body, version: version + 1 }));
    return { version: version + 1 };
  });
```

- **Writes:** the handler body only.
- **Falls out:** the frame, the types, the served operation on the Worker (`Handlers.serve`,
  `packages/language-effect/src/modules/handler/service.ts:26`) and every client.
- **Enforced by:** the wrapper, in fixed order: decode (`:104`), role (`:46`), span (`:83`), replay a request key
  (`:52`), machine (`:57`), the counted handler and its steps (`:60`), answer check (`:64`), commit (`:71`).
- **Portal shows:** the operation's span with its step spans (`draft.edit.load`, `draft.edit.save`), the commit's span
  with `committed` or `conflict` (M1.18), the refusal by code, the role check's span (PR #48, O3), and `DraftEdited`
  in the journal when the call wrote.

**Steps are spans, not durable work.** A named step is a span inside one attempt, and the handler decides which steps
run. A rerun after `Conflict` runs them again. An operation may declare no steps at all
(`packages/forman/src/modules/operations/types.ts:46`).

**Branching.** Eval 6 requires every declared step on an answered call, so a handler that skips a step on a
successful path fails it. The unchanged edit above is that case. Three ways were weighed:
- making every step mandatory on success, and splitting the operation or always running the step;
- marking a step `optional`;
- declaring alternative paths.

Splitting moves a choice the handler makes onto the caller, who can't know the text is unchanged. Always running
`save` writes for nothing, and it would commit a `DraftEdited` for nothing. Alternative paths are a second language
inside the declaration. **Decided: `Blueprint.step.<kind>({ optional: true })`.** Eval 6 lets an optional step be
absent, and still checks the order of the steps that ran. `ortho prove` reports an optional step that no journey ever
ran, or that every journey ran, as never exercised both ways, so both paths get a journey.

**Unused steps at compile time.** A declared step the handler never calls compiles today, and only eval 6 catches it
at prove. TypeScript can't prove that a function calls something on some path without changing the handler's shape
(for example, making it return a receipt per step), and that costs every handler for a rare mistake. **Decided:** the
frame's type stays as it is. `ortho check` warns when a non-optional step's runner (`steps.save`) never appears in the
handler's source, and eval 6 stays the proof. Both land in M1.26.

**The event (Q5).** `emits: DraftEdited` is committed in the same commit as the call's writes, only when the call
succeeds: the same rule a move's event follows (`service.ts:68-71`). The proof asserts it is present on a successful
call and absent on a refusal. One refinement, which this record makes and Aaron can overrule: a successful call that
writes nothing, like the unchanged edit, emits nothing. "Edited" would otherwise be said of a draft that didn't change,
and the forum adapter would post it. A move's event is unchanged.

### 4. A chain operation: voting

```ts
// blueprint/things/proposal/verbs/vote.ts
export default Blueprint.operation(Proposal, {
  description: "Cast your one vote on an open proposal.",
  payload: { proposal: Proposal.fields.id, choice: Choice },
  answer: { yes: Votes, no: Votes },
  move: machine.moves.vote,           // from passed or failed: ProposalNotOpen, the generated refusal
  errors: [AlreadyVoted],             // K7: NotAMember dropped; `allowed: [member]` already refuses with NotAllowed
  allowed: [member],
  runs: "chain",                      // new: refused by the compiler today, M6.10 (superseded by K25, 20 November 2026: worked out, never written)
});
```

```solidity
// src/proposal/vote.sol (scaffolded once; the generated wrapper calls it)
function _vote(Proposal storage p, address member, Choice choice) internal override {
    if (voted[p.id][member]) revert AlreadyVoted(p.id, member);
    voted[p.id][member] = true;
    if (choice == Choice.Yes) p.yes += 1; else p.no += 1;
}
```

- **Writes:** the declaration and the Solidity body.
- **Falls out:** `language-solidity` writes the contract around the body, as the frame's vault does
  (`frame/examples/allowance-on-chain.md`, "Blanks and handlers"). That means the external function, the signer
  recovered from the member's EIP-712 signature (M6.01), the machine check, membership, the custom errors with the
  same refusal codes, the event and the ABI. The SDK, CLI and actions have the member's wallet sign, and the relayer
  submits (L4.06).
- **Enforced by:** the contract. The SDK may simulate first (L3.07) and refuse early, but the contract is the
  authority, whichever door the call came through.
- **Portal shows:** the submission (transaction hash), its simulation, the receipt, the decoded refusal with its code,
  and the confirmed `VoteCast` event from the chain follower (M6.09).

Today the compiler refuses `runs: "chain"` (`describe.ts:108`, message at `:170`), and `language-solidity` is a
placeholder (`packages/language-solidity/src/index.ts:1-2`). How an operation maps to what runs on chain, which
contract functions clients may reach, and how contracts we don't write come in, moves to K7: Solidity, Noir and
Solana worked out together, so their edge cases show up before any of them is built (Aaron, 18 November). K7
([`K7-chain-languages.md`](K7-chain-languages.md)) now answers it; where this seam and K7 disagree on chain, K7 wins.

### 5. The doors: SDK, CLI, MCP tools, actions

**The SDK contract** is settled here. Today an SDK method takes only a payload
(`examples/acme/generated/sdk/src/allowance/spend.ts:8-9`). From M1.12:

```ts
// the caller is the client's, not the call's
const client = Workshop.layer({ url, credential: Credential.session(cookie), wallet: Wallet.eip1193(provider) });

// an Effect operation: typed refusals in the error channel; one request key across retries
const edited = yield* draft.edit({ draft, body, version }, { requestKey });
//    Effect<{ version }, DraftChanged | NotAllowed | InvalidPayload, Workshop>

// a chain operation: a submission now, confirmation later
const sent = yield* proposal.vote({ proposal, choice: "yes" });   // simulated; the wallet signs; the relayer submits
const tally = yield* sent.confirmed;                              // the follower saw VoteCast for this intent (K7 Q3)
//    Effect<{ yes, no }, AlreadyVoted | NotAllowed | ProposalNotOpen | Dropped, Workshop>
```

- **The caller** is set once, on the client's layer: a session, a key, the device flow or an agent's OAuth token.
  Never per call.
- **Stable retry identity:** the caller gives a `requestKey`, or the SDK makes one when the call starts and keeps it
  across its own retries. A screen makes one when its form opens. An agent tool uses its tool call's id.
- **Typed refusals:** every declared error is a class in the error channel, with its refusal code. A defect is a die.
- **Tool exposure** follows K2's inclusion rule, from `allowed` and `via`. An operation that is `.notVia(Via.agent)` is
  never an MCP tool or an agent tool.

The doors:

| Door | Writes | Falls out | Enforced by | Portal shows |
|---|---|---|---|---|
| HTTP API + OpenAPI | nothing | from the model | the wrapper, on the Worker | the request's span as the parent |
| SDK | nothing | from the model, per language | the operation's enforcer | the caller's span and the request key |
| CLI | nothing | built on the SDK | the same | the process span, and the exit code against the error's code |
| MCP tools | nothing | one tool per operation the rule admits, on the Worker | the same | the tool span |
| Actions | where they bind | from the model, built on the SDK | the same | the action's span as the parent |

**An action** is generated from an operation, in agent-native's action shape (decision 1), ported into an `actions`
module of `forman` (which depends only on Effect). The field names are `defineAction`'s own
(`packages/core/src/action.ts:1011-1153` at 0.228.2), so agent-native templates and skills read naturally:
`description`, `schema`, `outputSchema`, `errors`, `readOnly`, `retrySafe`, `needsApproval`, and the two exposure
fields, `agentTool` and `mcpTool`.

```ts
// generated/actions/proposal/vote.ts. Generated from blueprint/things/proposal/verbs/vote.ts. Do not edit.
import { defineAction } from "@formants/forman/actions";   // new, M1.23: our port of agent-native's shape, in Effect

export default defineAction({
  description: declaration.description,
  schema: standard(declaration.payloadSchema),        // Standard Schema plus its JSON Schema, from Effect
  outputSchema: standard(declaration.answerSchema),
  errors: refusalsOf(declaration),                    // AlreadyVoted, NotAllowed, ProposalNotOpen: codes kept
  readOnly: false,                                    // true only for reads
  retrySafe: true,                                    // because the SDK carries one requestKey across retries
  needsApproval: true,                                // a chain write: the member's wallet signs
  agentTool: true,                                    // false when the operation is .notVia(Via.agent)
  mcpTool: false,                                     // MCP is the Worker's own door, once per operation (X-05)
  run: (args, ctx) => ctx.sdk(proposal.vote(args, { requestKey: ctx.callId }).pipe(Effect.flatMap((s) => s.confirmed))),
});
```

Two things differ from agent-native's version: `ctx` carries the SDK client and the call's id (agent-native's `ctx` has
neither, `action.ts:190-270`), and `errors` carry the operation's refusal codes.

Because the field names match, an agent-native app can use these actions as its own: it registers them and calls our
Worker through the SDK. That is how Orthograph aims to power agent-native apps without being one. M1.22 checks the
shape with a type test against agent-native 0.228.2's recorded field list, without installing agent-native.

The action holds no authority. Its `run` is the SDK, so the operation's enforcer decides every time. `agentTool` and
`mcpTool` decide what is offered to screens and tools, never what is allowed. The React bindings and the portal's UI
live in a separate package, `@formants/portal` (to be `@orthograph/portal`), so `forman` stays Effect only.

### 6. Steps and workflows: publishing

A step lives inside one attempt. A workflow lives across attempts and owners. Publishing crosses D1, a person's
wallet and the chain, so it is a workflow: (Superseded by K46, 26 November 2026: it is a workflow only when no single thing can hold the wait.)

```ts
// blueprint/workflows/publish.ts: illustrative; the exact shape is M3.01's decision
export default Blueprint.workflow({
  description: "Put a frozen revision to the vote, and link the confirmed proposal back to it.",
  starts: { revision: Revision.fields.id },
  activities: {
    freeze:  Blueprint.activity.call(revision.freeze),                      // a D1 commit: body and digest frozen
    propose: Blueprint.activity.client(proposal.open, { by: "member" }),    // the member approves the wallet call  (Superseded by M3-workflows, 22 November 2026)
    seen:    Blueprint.activity.await(Governance.events.ProposalOpened,     // the confirmed event, with the
               { match: { proposal: "propose.proposal", digest: "freeze.digest" } }), //   expected proposal and digest  (Superseded by M3-workflows, 22 November 2026)
    link:    Blueprint.activity.call(revision.link),                        // a D1 commit: revision ↔ proposal
  },
});
```

- **Writes:** the workflow declaration. Each activity is an operation that already exists.
- **Falls out:** the run as a thing with a generated machine (`freezing → awaiting signature → awaiting confirmation →
  linking → published`, S25), a wait for each activity, and the portal's run view.
- **Enforced by:** each activity's own enforcer (the wrapper or the contract), plus the workflow engine. The engine
  records each finished activity once, so a replay skips it.
- **Portal shows:** the run, with each activity's state across owners: the D1 commit, the waiting signature, the
  transaction and the confirmed event.

Settled here:
- an activity is recorded by run id plus activity name, and a replay skips finished activities;
- a wait wakes on an event through `on:` or on a durable timer through `Timers`.

The exact declaration, wake-up, deduplication and replay stay open for M3.01 (decision 4), proved by the M3.03 spike.
An operation with no machine may declare its own event (Q5, seam 3). M3.01 settles its place beside workflows, M3.16
builds it, and until then such an operation emits nothing.

### 7. Private membership on Noir (later)

- **Writes:** membership with `visibility: "private"`, and the vote declared on a Noir store kind that declares the
  private-state capability (K3 item 2, ledger `G-04`).
- **Falls out:** the circuit around the body, the client's proving code, a one-use claim (a nullifier) scoped to the
  proposal, and a public tally.
- **Enforced by:**
  - eligibility is proved in the member's own authorised PXE;
  - the claim stops a second vote on the same proposal;
  - the tally's public path checks at execution that voting is still open.
- **Portal shows:** only the public footprint: the claim, the tally's change and the proving time. Never who voted.

The limits stay explicit:
- a transaction's metadata (its sender, its timing and who paid the fee) is visible;
- proving time is measured, and goes in the budget;
- the Noir spike proved locally, and its network skipped proof verification (`spikes/noir-private-core/README.md:15`).

An unverified local proof is labelled, and it blocks production (S30).

### 8. Plugins: the governance feature and a forum adapter

```ts
// blueprint/features/governance.ts: the app mounts the reusable feature
export default Blueprint.use(governance, (g) => [g.choose(g.choices.voting.onChain)]);

// blueprint/adapters/forum.ts: the outside forum, its calls and events
export default Blueprint.use(discourse, (f) => [f.include(f.calls.topics.create, f.events.postCreated)]);
```

- **Writes:** one mount file per plugin.
- **Falls out:**
  - the feature brings Draft, Revision, Proposal, the publish workflow, their journeys and its own stores;
  - the adapter brings typed calls (post the published revision), events in through `on:`, a stand-in and a
    conformance test.
- **Enforced by:** the feature's own operations; the adapter's declared errors at the step that calls it.
- **Portal shows:** an origin badge on every thing and operation, and each adapter's calls as step spans
  (`kind: call`).

### 9. Identity and organisations

K2 stands: `@orthograph/auth` and `@orthograph/organizations` (M2). With the portal built on Orthograph, there is no
second login and no bridge. The first version's Q2 is answered by decision 1. The builder signs in to the portal
through the project's own auth. In a local world, the portal acts as the cast (F6 #4). The apps people build sign in
with the same auth and hand the SDK their credential.

### 10. The portal

- **Writes:** nothing for its pages, and notes attached to a thing.
- **Falls out:** the portal template, designed by us with agent-native's templates as the reference, on pieces ported
  from agent-native:
  - **shell and chat:** our port of the app shell and chat, with screen context, served by the project's Worker;
  - **pages:** every page is drawn from the model;
  - **notes:** a note is a thing in the portal feature's own store (K3 item 7), with prose about a declaration kept
    beside it in the repository (F6 Q3);
  - **chat state:** threads and runs are things in the same store, not agent-native's Postgres tables; (Superseded by M1.25, `design/portal.md`: a conversation is an `@orthograph/agents` Run, and the portal's store keeps notes and grants.)
  - **live evidence:** read from the Collector's files, as PR #39 found.
- **Enforced by:** the portal changes nothing on its own. Its "Try it" calls through the SDK as the signed-in builder,
  or as the cast in a world.
- **Portal shows:** things and their lifecycles first. Then operations, machines, events, errors, and notes on their
  thing. Live evidence lights up the declared structure.
  - A machine's moves show their live counts.
  - An operation's steps light up as their signals arrive.
  - A refusal row shows how often it fired.

Live evidence needs four things that `main` doesn't have yet:

| Gap | Evidence today | Settled, or its owner |
|---|---|---|
| Work in flight. OTLP exports only ended spans, and the Worker flushes after the response | one runtime per request, exported every 100 ms, disposed and flushed under `waitUntil` (`packages/host-cloudflare/src/modules/telemetry/service.ts:10`, `:44-50`); the spike builds a call only from a finished trace (`spikes/generated-app/app/server/forman/live.ts:29-53` at `c0f0abd`) and measured 150 to 174 ms from call to screen, for calls of 1 to 11 ms | **Settled:** the runtime emits a step signal, an OTLP log record with the trace id, span id, step and phase (start, end, outcome), as each step starts and ends. The portal joins starts to ends by span id. The latency floor is the export interval, plus the Collector's flush, plus the portal's push. New slice **M1.21**, which also measures whether the 100 ms interval exports ended steps while a long request runs |
| Committed events. A span is not proof that an event was committed | events are written in the commit (`packages/language-effect/src/modules/handler/service.ts:68-71`) | **Settled:** the portal reads committed events from the journal for D1 and actor stores (M1.21), and from the chain follower for contracts (M6.09) |
| Journeys and starting worlds are not in the model | `describe.ts:162` | **Owner:** M1.03 |
| A fixed renderer list. Plugin mounting is only planned | `packages/generators/src/modules/render/service.ts:1-9` | **Owner:** M1.11 to M1.13 (projections as plugins). The portal is mounted as a projection |

## The boundaries

| Boundary | Owned by | What crosses it | What never crosses it |
|---|---|---|---|
| Blueprint → model | `@orthograph/forman` (the API), the compiler | declarations, read by path; out comes the model | a declared name written as a string |
| Model → language | each language | the model, and declarations as imports | behaviour, which is only in `src/` |
| Language → host | each host | the runtime's needs as services (`Store`, `Journal`, `Timers`, `Principals`, telemetry) | a host's types in a handler |
| Handler ↔ enforcer | the language (the wrapper, or the generated contract) | the payload, the principal, steps and the move in; an answer or a declared refusal out | storage, transport, a span written by hand |
| Enforcer ↔ door | the projection that makes the door | the payload, a credential, a request key and a `traceparent` in; an answer, a refusal with its code, or a defect out | a second role check |
| SDK ↔ action | the actions projection | input, output, refusals, exposure | authority: an action never decides |
| Server ↔ chain | a workflow (K3 item 5) | an activity's call and the confirmed event it waits for | one commit spanning both |
| Store ↔ the world | the store's kind | one commit: writes, journal, outbox and request key, versioned | another writer |
| Source ↔ handler | the adapter | typed calls as steps, events in through `on:` | a migration or a commit |
| Evidence ↔ portal and proof | prove, the logbook, the portal | spans, step signals, journal and chain events, counts, under model names | untraced text and private fields (O2) |

## Languages and hosts

**A language** is what behaviour is written in and what the model is rendered into. It owns the frame, the blanks,
the enforcer's meaning and the clients written in it:
- `language-effect`: the wrapper and the TypeScript SDK;
- `language-solidity`: the contract, the ABI and the contract's client;
- `language-noir`: later;
- `language-python`: clients only.

**A host** is where code runs, and it supplies what the runtime needs there:
- `host-cloudflare`: workerd, D1, Durable Objects, alarms, OTLP;
- `Host.chain`: an EVM, running the `chain` store kind;
- `Host.node`: the CLI, and adapters workerd can't reach;
- `Host.browser`: client operations and the wallet adapter.

A language never chooses where it runs, and a host never gives an operation meaning.

## Porting from agent-native

We learn from agent-native and port what we need; nothing of theirs runs. There is no vendored copy, no
`@agent-native/*` dependency and no code exempt from our rules. Each piece is rewritten into our own packages under
the code's own rules: Effect, the six-slot modules, D1 and stores, `@orthograph/auth`, and our one MCP. The reference
is agent-native 0.228.2 (release commit `49a844c1b`, MIT licensed). Upgrades don't exist as such. When agent-native
does something we want, we read it and port it again, by hand.

**Compatible where it's free.** We keep `defineAction`'s field names (`description`, `schema`, `outputSchema`,
`errors`, `readOnly`, `retrySafe`, `needsApproval`, `mcpTool`) and the rule that a refused call means no write
(`action.ts:1572-1645`). The reason is that agent-native templates, docs and skills then read naturally against our
code. Nothing is compatible at runtime, and nothing needs to be.

What we port, sized from the 0.228.2 packages (non-test TypeScript lines, or built JavaScript where only that ships):

| Piece | agent-native's source | What we write | Our size |
|---|---|---|---|
| The action shape and its exposure rules | `core` `action.js`, 1,883 lines, plus the `action-*` helpers | `defineAction` in `forman`'s `actions` module: fields, Standard Schema, `ctx` with the SDK and call id, the exposure rule from `allowed` and `via` | S, about 400 lines |
| Approvals | `toolkit/app/mcp-approval`, 913 lines; `needsApproval` in `core` | an approval step in the chat and on screens: show the call, wait for yes, then run through the SDK; for a chain write, the wallet prompt | S, about 400 lines |
| The app shell | `toolkit/app-shell`, 2,540 lines | the portal's frame: navigation by thing, the reading column, the live rail, the drawer (UX.md's five rules) | M, about 1,500 lines |
| The chat | `toolkit/app/chat`, 43,862 lines; `composer`, 22,979; `agentkit`, 11,286 built | a narrow chat surface: thread, streamed answer, tool-call cards, approvals and refusals; threads as things in the portal's store. The agent behind it is not ported: it is one of our own durable agents (M4, a run per thread on a Durable Object), with actions as its tools | L, about 4,000 lines, grown later |
| Screen context | `toolkit/context-ui`, 1,179 lines | what the builder is looking at (thing, operation, trace), given to the chat as context | S, about 500 lines |
| Template layouts | `core/src/templates` (`default`, `chat`, `workspace-core`) | the portal's own layouts, after the portal's design (M1.25) | M, about 700 lines |

The whole port is about 7,500 lines of our own code, set against more than 80,000 in the parts of agent-native it
learns from. The chat is most of it, so the chat starts narrow. agent-native's agent loop (`agentkit`) is learned from
and not ported: our agents are durable, on a different stack.

What we learn from but don't port: its Postgres client (`db/client.ts:1938` throws on anything but a Postgres or PGlite URL) and
the PGlite that comes with it, its own Better Auth and organisations (`server/auth.ts:470`, `OrgRole`), its roughly 170
tables, its own MCP server, its deploy (`cloudflare_module`, `deploy/build.ts:142`), A2A writes through the LLM loop,
and its `otel` package. Our stores, auth, Worker, MCP, `ortho` and tracer already do each of these.

## Decided here

These are the building agent's calls, with the evidence above. Aaron can overrule any of them.

1. Each operation has one enforcer: the wrapper on the Worker, or the contract. Every door, action and screen reaches
   it through the SDK or the Worker.
2. The SDK contract: the caller is set on the client's layer; a stable `requestKey` is kept across retries; declared
   refusals are typed in the error channel; a chain operation returns a submission with `confirmed`; tool exposure
   follows `allowed` and `via`.
3. An action keeps agent-native's `defineAction` field names, ported into `forman`'s `actions` module in Effect, with a
   `run` over the SDK. `ctx` carries the SDK and the call's id.
4. Nothing of agent-native runs. Its action shape, approvals, shell, chat, screen context and layouts are ported into
   our packages under our rules (M1.23, M1.24). Its database, auth, MCP, tables and deploy are not ported.
5. The portal is a projection plus a small feature, designed by us (M1.25) on the ported pieces. Its notes and chat state are
   things in the portal's own store. Its live data comes from the Collector, the journal and the chain follower. (Chat state superseded by M1.25, `design/portal.md`: conversations are `@orthograph/agents` Runs; the store keeps notes and grants.)
6. Step signals are OTLP log records sent as each step starts and ends (M1.21), so work in flight is visible.
7. A workflow activity is keyed by run id and activity name, and a wait wakes on `on:` or `Timers`. The rest belongs to
   M3.01.
8. A chain is a host, and its store kind is K3's `chain`. A server call that sends a transaction is a workflow. (Superseded by K46, 26 November 2026: it is more than one call.)
9. Noir's limits are part of the contract: metadata is visible, proving time is in the budget, and an unverified proof
   blocks production.
10. The scaffold is a wired function: the steps in declared order, the move, and a stub per refusal, each hole a
    `Handlers.blank` (M1.26).
11. A step can be `optional`, and eval 6 allows it to be absent. Prove reports an optional step that no journey ran
    both ways.
12. Unused steps are an `ortho check` warning plus eval 6, not a type error.
13. An operation's own event (Q5) is committed with the call's writes, only on success, and only when the call wrote.

## Forks for Aaron

The first round's three questions are answered by his decisions:

| # | First round's question | Answered by | His words |
|---|---|---|---|
| Q1 | Where an operation runs, and who serves its doors | decisions 1 and 3 | "Those apps use the generated SDK, CLI, MCP tools and actions"; "it uses the SDK. The underlying operation keeps its authority" |
| Q2 | Whose identity | decision 1: nothing of agent-native runs, so there is no second login | "drop Agent Native totally … our own thing … their MCPs and our MCPs are just our stuff" |
| Q3 | Who the generated app is for | decision 1 | "The portal is the builder's place to understand and plan with the running system" |

The second round:

| # | Question | Aaron's answer |
|---|---|---|
| Q4 | How a declared operation maps to a contract's ABI, and what clients may reach | Only our own contracts: "other people's contracts are sources, reached through adapters" (K3 item 8). He leans to the recommendation, A: the operation is the function. He also asked for Solidity, Noir and Solana to be worked out together first, so Q4 went to K7, the chain languages war game. **Replaced by K7**: its Q1 (fork F1) asks him to confirm A on three chains |
| Q5 | Whether an operation with no machine may declare its own event | "B, on the operation." Committed with the call's writes, only on success; proof asserts it present on success and absent on a refusal; steps stay spans. Until M3.01, no event. Seam 3 records one refinement: a call that writes nothing emits nothing |

## Milestone slices this shape changes

The build plan stays. These are the slices it touches:

| Slice | What happens |
|---|---|
| M1.03 | **Unchanged**, now needed by the portal as well: journeys and starting worlds in the model |
| M1.11 to M1.13 | **Changed.** The fixed renderer list becomes mounts. M1.13 becomes "docs and the portal": our designed template on the ported pieces, from the model plus live evidence, served by the project's Worker |
| M1.12 | **Changed.** sdk, cli and mcp, plus the SDK contract (caller on the layer, `requestKey`, typed refusals, exposure from `allowed` and `via`) |
| M1.21 | **New.** Live steps: step signals as they start and end, and committed events read from the journal for the portal |
| M1.22 | **New.** The actions projection: one `defineAction` per operation, built on the SDK. The `--through actions` replay is M2.08 |
| M1.23 | **New.** The port, part one: `defineAction` and approvals in `forman`'s `actions` module |
| M1.24 | **New.** The port, part two: the shell, the chat's surface, and screen context, in Effect, over D1; signed in through the project's auth (`@orthograph/auth` from M2.06) |
| M1.26 | **New.** The scaffold as a wired function; `optional` steps in eval 6; the unused-step warning in `ortho check` |
| M1.25 | **New.** The portal's design, worked through with Aaron (UX.md's intent, agent-native's templates as the reference), before M1.13 builds it. Aaron asks to see UX before it is drawn, so this is his session by his rule, not a block |
| M2.06 | **Changed.** Builders sign in to the portal through `@orthograph/auth` |
| M2.08 | **Changed.** `--through cli\|mcp\|actions` |
| M3.01 | **Changed.** Starts from decision 4 and the settled activity key; workshop's publish is its example |
| M3.16 | **New.** `emits:` on an operation (Q5), built: present on success, absent on a refusal, absent when the call wrote nothing |
| M3.12 | **Parked**, with the skills design (PR #37) |
| M3.14 | **Parked**: the portal's separate Work surfaces (decision 2) |
| M5.06 | **Unchanged**: the data map is a portal page |
| M5.07 | **Unchanged**; the forum adapter is made with it |
| M6.01 | **Changed.** It starts from K7 (chain languages), and settles the generated client contract for chain operations and wallet submission |
| M4.16 | **New.** The portal's chat on a durable agent: one run per thread, the actions as its tools, approvals through the chat |
| M6.09 | **Changed.** The follower also feeds the portal's committed chain events |
| M6.10, M6.11 | **Changed.** `runs: "chain"` is lifted, and `language-solidity` stops being a placeholder |
| M6.15 | **Changed.** It builds the SDK's `submission.confirmed` |
| M6.20 | **New.** `examples/workshop` on chain: the governance feature, the vote, the publish workflow and the forum adapter's stand-in |
| Later | **New line.** The workshop's private membership on Noir, proved on a verifying network before any claim (S30) |

PR #41's agent-native prototype is kept as research, the way PR #39 is, and is the reference for M1.24 and M1.25. F6
is amended: the app it describes is the portal, our own design on the ported pieces.

## What changes elsewhere

- **K2.** It stands, with a note at its top pointing here. Its "portal" is the portal of decision 1. Actions join the
  projections.
- **K3.** Item 2 says a chain is a host that runs the `chain` store kind.
- **F6 (PR #41).** The app is the portal, our own design on the ported pieces. Its UX intent stands (decision 2).
- **The ledger (PR #47).**
  - `PRJ-43` holds: an action keeps agent-native's shape, sits beside the doors, and each door exists once per
    operation. Generated actions keep the `mcpTool` field, set to `false`; the only MCP is ours, on the Worker.
  - `G-01`, `PRJ-01` and `X-01` change: M1.13 is "docs and the portal", our design (M1.25) on the ported pieces (M1.23, M1.24). M3.14 is
    parked, not moved. M5.06 stays its own slice, as a portal page.
  - These still hold: `LAH-04`, `STO-02`, `X-18` (chain), `G-04` (private state), `G-03` ("home" retired) and `X-05`
    (MCP on the one Worker).

## The corrected layer order for the canon

Layer 1 was the core pieces. But a handler can't be explained without its language and enforcer, an operation
without its doors, and a thing without its store. So **layer 1 is the shape**: one page per primitive at this record's
level.

| Layer | Pages | Leans on |
|---|---|---|
| 1 · the shape | `forman` (to be `orthograph`), `blueprint`, `languages-and-hosts`, `plugins`, `data`, `doors` (the enforcer, the SDK contract, CLI, MCP, actions) | nothing |
| 2 · the core | `things`, `machines`, `operations` (with steps), `roles`, `handlers` | 1 |
| 3 · proof | `journeys`, `proof`, `traces`, `stand-ins` | 2, and the doors (replay) |
| 4 · data in depth | `stores`, `views`, sources (on `adapters`) | 2 and 3 |
| 5 · plugins in depth | `features`, `adapters`, `projections`, `portal`, `secrets` | 1 to 4 |
| 6 · running | `workflows`, `environments` | 4, 5 |
| 7 · what Orthograph ships | `auth`, `agents`, `factory`, `agent-kit` (both parked surfaces noted) | everything above |

`data` and `doors` are new pages. `portal` replaces "the-app". Signup carries layers 1 and 2, and the workshop is the
end-to-end example from layer 4 on.

## Open risks

- **Chain confirmation in the SDK.** `confirmed` waits on the follower. A reorg after confirmation is a correction
  event (M6.09), not a second answer.
- **Step signals cost requests.** One small send per step start and end, under `waitUntil`. They are measured in
  M1.21 against the budget.
- **The port is mostly the chat.** About 4,000 of its 7,500 lines are the chat's surface. agent-native's
  chat is about ten times that size, so ours starts narrow (thread, stream, tool calls, approvals, refusals) and grows
  only as the portal's design asks.
- **Compatible by names only.** agent-native's templates and skills read naturally against our field names, but none
  of their code runs. A change they make reaches us only when we port it.
- **Noir metadata.** Even with private membership, timing and the fee payer are visible. The portal says so on the
  vote's page.

## Later: K9 (18 November 2026)

These notes sit at the end so the canon's line-numbered quotes of this record stay exact.

- **The worked example is superseded** by [`K9-growing-example.md`](K9-growing-example.md): the example is `links`,
  in four stages. The workshop's governance and votes are dropped; its private membership and ballots become stage 4.
  The seams in "The worked example" still hold.
- **The actions sketch in seam 5 is corrected** by K9's "Agent-native compatibility" (from
  `spikes/agent-native-compat/`): its `run` does not compile against agent-native's `ctx`, `retrySafe: true` is
  harmful, and the module exports `options(host)` for the host to wrap. The sketch stays as written.

## Builder-run checks, audited (author, 18 November 2026)

M1.16 and M1.26's checks (`e2e/m1/10-empty-and-scaffold.test.ts`, the `optional-edit` fixture, and eval 6's optional case in `calls.ts` and `evals.test.ts`) were committed as fea6bf6 by the same Codex run that built 9d0ad5a and 03d710e. AGENTS.md wants a different agent to write them, so a ✍️ author who wrote none of it audited the commit against the M1.16 and M1.26 rows, this record (seams 3 and the two "Decided" paragraphs above) and `e2e/m1/README.md`. The author ran check 10 on fea6bf6 (the builder's parent) and on the PR head.

- **Red before the builder.** On fea6bf6 all four tests failed, each at the unbuilt surface: `Unrecognized flag: --empty` (M1.16); a scaffold whose body is one `Handlers.blank("this handler is not written yet")` (M1.26 wiring); the model's `save` step carrying no `optional` (the fixture); `ortho check` printing no warning (the unused step). On the PR head all four pass, and eval 6's 19 unit tests pass.
- **`10-empty-and-scaffold.test.ts`: accept with change.** Each done-when is tested against real output: acme's `revoke then spend` is `✘ 1/3` with exactly the two named red steps, the third `✔ ... proved by the description`, the handlers byte for byte unchanged and nothing left running; fresh scaffolds go through `generate` and the real `tsc`, with the step order, refusal and move read from the source and the reached blank named per red step; the optional `save` is read back from the model, reported one-way, then passes eval 6 beside the unchanged journey. Two gaps, fixed on `m1-author-audit`: the warning test had no control (an unconditional warning would pass it), and K5 says an optional step that *no* journey ran is reported too, while only the always-ran direction was tested. The branch adds a control (acme as shipped and an optional step the handler never calls both give no warning) and the never-ran direction (only `keep the limit`).
- **The `optional-edit` fixture: accept as authored.** One verb, one handler, two journeys, copied over a real acme copy; the handler really compares `limit` before saving, and the keep journey asserts `noEvents()` and `spans({ absent: ["allowance.edit.save"] })`, so a pass proves the skip happened. The answer echoes the payload's `limit` (weak alone), but the span and event assertions carry the check. No mocks.
- **Eval 6 in `calls.ts` and its unit test: accept as authored.** It is a sharpening, not a weakening: only a step marked `optional` may be absent; a required step with no span still fails, the order check still covers every step that ran, and a refused or replayed call is still exempt. The unit test fails on the old line (the absent `save` was a failure), includes the out-of-order and missing-required cases, and was written before the builder's code. One cosmetic point, not a change: `"optional" in s && s.optional === true` was a type guard from before the model type carried `optional`, and can be `s.optional === true` now.
- **Left open.** `10` has no README row on the PR head (added on the branch); the README's red-test counts describe the state of M1.02 and were not renumbered.
