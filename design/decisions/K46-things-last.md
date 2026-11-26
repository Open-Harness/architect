# K46: things last, operations are short, and a seal joins two places

**Decided 26 November 2026 by Aaron**, in the session that made the Capxul Lite explainer films (pull request #1100).
Recorded by that session's agent under AGENTS.md, "Who decides". Its id was the next free K in `design/handoff.md`. It was taken without asking the
conductor first, as the `github` skill says a call that crosses goals should; the conductor was asked to record it
afterwards. This record is the delta: what the design says now that the repository did not say that
morning, what each call changes in older records, and what is still open.

The evidence is the design board, `docs/explainer/films/capxul-lite/board/board.html` (his notes on the first cut of
the film, the three joins graded on one rubric, and the argument for each call below), the worked design it was argued
on, `docs/explainer/films/capxul-lite/app/` (nothing in it is compiled), and the two films made from it.

## The problem, in plain words

Capxul Lite is a stripped-back Capxul: each company's treasury is a contract with budgets built in, and a server keeps
each payment's reason and the books. Working it through as a blueprint put pressure on four things the repository
already said.

1. **One act that changes two places.** Ada pays a supplier and says why. The chain moves the money; the reason can't
   go on a public chain. `docs/canon/data.mdx` called that "a workflow, with a waiting state between". Everything the
   framework generates is per operation, so two operations leave every client to learn the recipe that joins them.
2. **Something that has to wait.** A new budget needs two of three owners. K5 and M3.01 put waiting in a workflow,
   whose order lives in a handler.
3. **Where the contract is.** K25 has one deployment per network, as a module a Safe switches on. Capxul Lite has no
   Safe, and a company has to be payable at an address of its own.
4. **Changing a rule that is live on a chain,** with money in it. Nothing in the repository says how.

## What Aaron decided

Each call is quoted from the session, in his words.

1. **Work across two places is not, for that reason, a workflow.** "I'm not saying that it is a workflow ... Don't say
   it's a workflow if it isn't." A spend is a machine: nothing has to remember where the work has got to except the
   thing itself. Agreed when asked ("agree with questions").
2. **Things last, and operations are short. A waiting thing says what it needs, and the framework asks.** His words:
   "should this not be done on the thing level? ... things should know what they need and what they dont." Agreed as
   the first of two layers ("yes both layers"). An operation stays one call and one commit. If something has to wait,
   it is a thing, in a state, and the moves out of that state are what it needs: a caller in a role, an event from
   another thing, or a clock. A grant is a `Proposal` that asks for enough owners.
3. **When the other half of an act is only data, seal it.** The second layer ("yes both layers"). A spend is one chain
   operation and one signature. Its private field travels with the signed call to the relayer, which is ours; the chain
   carries only a salted hash of it, the seal. This replaces the "next step" the session first proposed, which he
   rejected ("i dont like that solution").
4. **The order of anything that spans a wait is declared, even at a level nobody reads.** "This could be a lower level
   you dont want to but its still something the agents writing the blueprint should want done." The test for the
   blueprint is whether the framework needs to know a thing, to check, draw and prove it; not whether a person reads it.
5. **A contract per company, from a factory.** "yes factory." A chain store may make one contract per instance of a
   thing that is its root.
6. **Contracts that can be upgraded, and contracts that can't.** "both upgradeable and non." The store says which.
7. **The private chain is Aztec, designed and not implemented.** "yes aztec but designed not implemented." A private
   thing can live on a chain when the chain is private (his correction to the first film, which said it could not).
8. **The follower is the indexer.** "yes indexer." Filed for the framework goal as #1146.
9. **A reference per thing, beside a piece per operation.** Agreed when asked ("agree with questions"): the hook and
   the headless parts he asked for are a generated reference to a thing, with its state, the fields this caller may
   see, the moves open now, and what it is waiting for.

## What is sketched, and not decided

The spellings below are the session's, written to argue the calls. Nobody has agreed a name or a shape, and none has
a slice. `docs/explainer/films/capxul-lite/app/` has each in use; every line of them ends `// new` there.

```ts
// 3: a sealed field, on an operation's payload, an event or a thing in a public chain store
reason: Blueprint.sealed(Reason),

// 2: a move that is made when enough holders of a role have made another move; the framework asks them
pass: { from: ["open"], to: "passed", emits: Events.ProposalPassed,
        asks: Blueprint.atLeast(Treasury.fields.threshold, owner, "approve") },

// 9: what a thing's reference gives a screen
proposal.state   // "open"
proposal.can     // ["approve"], for this caller
proposal.needs   // one more owner, within 6 days

// 5 and 6: the thing that is the root of its store's contract, and a store whose contracts may be upgraded
lives: treasury.root(),
export default Blueprint.store.chain.evm({ upgradeable: true });
```

Also sketched, and no more than that:

- **A rule inside one record, as data**, so TypeScript and Solidity both enforce it:
  `Blueprint.invariant.atMost(Budget.fields.spent, Budget.fields.limit, { refuse: BudgetExceeded })`.
- **The outcome of a chain call as something that makes a move.** A refusal on chain leaves no event, so a server
  thing never hears "no". The relayer knows `reverted` and `dropped`; the follower already hands on a correction.
- **A check on waiting states**: every one needs a way out for yes, for no and for silence.
- **A rule change on a live contract is a published version.** New instances take it. For the others, the owners take
  it in place if the store is upgradeable, or move to a new contract if it is not. The compiler compares how each
  version stores its data and refuses an upgrade that would corrupt it.
- **"Once accepted, it finishes"** for a call to a thing in a database, as the relayer already promises for a chain
  call. What it should promise is clear; how it is built is not.

## What it changes in older records

| Record | It said | Now |
|---|---|---|
| K3 item 5, K5 seam 6 and item 8, K17, `data.mdx`, `stores.mdx` | work across two stores, or a server call that sends a transaction, is a workflow | it is more than one call, each committing to its own store, joined by an event; the wait is a state of a thing (call 1) |
| `operations.mdx` | work that must wait for something is a workflow | work that waits is a thing's state; a workflow is for work that belongs to no single thing (calls 1 and 2) |
| K25, "Not chosen" | a contract per organisation is not offered: "a contract that is the organisation would hold its whole treasury in generated code" | a chain store may ask for it (call 5). K25's cost is real and stays said: the money then sits in generated code. Its own choice, one module per network that a Safe enables, stands for Capxul on a Safe |
| K25, values | a private field on a chain store is refused: "a public chain shows every field" | still refused as `private`. A sealed field is the other way to hold it (call 3) |
| `status.md` | "The UI is pieces, not hooks" | a piece per operation and a reference per thing (call 9). K29 itself stands: its point was no hand-written hooks, and the reference is generated |

**M3.01 is not superseded here.** Its workflow stands as decided, for work that belongs to no single thing. Call 4
disagrees with one part of its shape, the order held in a handler, and call 2 takes ST3.06's case (collecting owners'
approvals) for a thing that asks. Both are for Goal 8's lead to answer in a record of their own.

**The name follower is not superseded here.** #1146 carries that rename as one change, code included, so the canon and
the code never disagree on a quoted line.

## What stays open

- Who deploys a contract, and where its address is kept. A checked-in record that only grows, like
  `blueprint/refusals.lock`, would fit.
- Production as an environment. It appears only in a portal brief, as "promotes from staging". A server can be
  promoted; a contract can only be deployed again from the same revision, and checked.
- Taking an environment down: a staging contract stays on its test network for good.
- Linking a wallet to a person (M2.13) is spiked and in no goal. Call 3 removes the need for it to pay; reading a
  sealed field back still needs it.
- Our server holds the words a seal stands for. Losing them loses the reasons, though never the money.
- A role written as code can't be listed, so its holders can be offered a move but not asked.
- Telling people a thing is waiting on them is a new part: a list per person and per agent, and how it reaches them.

## Who builds it

Nobody yet. No slice is claimed and no row is added to `docs/canon/status.md` or `design/milestones.md`: ranking it is
Goal 18's. `design/later.md` has a line for it. The canon's pages say the calls in words, each in a note that names
this record; they carry no designed code, because a designed fence needs a slice.

**Two live phrases are left for their owners**, so the rule in AGENTS.md ("One way to supersede") is not yet fully
met for call 1. Both are messages in code, and the canon quotes the first line for line:

- `packages/host-cloudflare/src/modules/store/service.ts:65`: "work across stores is a workflow (K3 item 5)".
- `packages/compiler/src/modules/model/internal/stores.ts:58`, the compiler's refusal of an operation that writes two
  stores, and the two tests that expect its words.

Changing them is a change to packages from a session that made films, so it is an Ask to Goal 3, not done here.

## Supersedes

- docs/canon/machines.mdx: "A machine doesn't wait or run on its own. Every move is one call. Work that waits is" → "A machine doesn't run on its own: every move is one call. Work that waits is a thing in a"
- design/decisions/K3-stores-and-sources.md: "Work across stores runs as a workflow, as cross-actor work already does" → "Work across stores is more than one call, joined by an event (K46)"
- design/decisions/K5-the-whole-shape.md: "so a server call that sends a transaction is a workflow (seam 6)" → "so a server call that sends a transaction is more than one call (K46)"
- design/decisions/K5-the-whole-shape.md: "| Server ↔ chain | a workflow (K3 item 5)" → "| Server ↔ chain | more than one call, joined by an event (K46)"
- docs/canon/data.mdx: "is a [workflow](workflows.mdx), with a waiting state between the two" → "is more than one call: each commits to its own store, an event joins them, and the wait between them is a state of a thing"
- docs/canon/data.mdx: "transaction writes two stores, so it is a workflow." → "transaction writes two stores, so it is more than one call (K46)."
- docs/canon/stores.mdx: "an operation commits to one store; work across stores is a workflow |" → "an operation commits to one store; work across stores is more than one call, joined by an event (K46) |"
- docs/canon/stores.mdx: "A server call that sends a transaction is a workflow. K7 decided" → "A server call that sends a transaction is more than one call (K46). K7 decided"
- docs/canon/operations.mdx: "Durable work is a workflow." → "Work that waits is a thing's state, and work that belongs to no single thing is a workflow (K46)."
- docs/canon/operations.mdx: "or wait for something, is a workflow (M3.01)." → "Work that waits is a thing in a state (machines, K46). A workflow is for durable work that belongs to no single thing (M3.01)."
- docs/canon/outline.md: "Durable work: processes that wait, and work across stores and owners" → "Durable work that belongs to no single thing; a wait that one thing can hold is that thing's state (K46)"
- docs/canon/outline.md: "Durable work across attempts is a workflow activity, on `workflows`." → "Work that waits is a thing's state, on `machines`; durable work that belongs to no single thing is on `workflows` (K46)."
- docs/canon/status.md: "The UI is pieces, not hooks (K29, K41 clash 2): one UI SDK piece per operation, in place of the React hooks ST1.01" → "The UI is a generated piece per operation (K29, K41 clash 2) and a generated reference per thing (K46), in place of the hand-written React hooks ST1.01"
- design/decisions/K3-stores-and-sources.md: "so by item 5 it is a workflow, with S25's generated waiting state between" → "so it is more than one call, and the wait between them is a state of a thing (K46)"
- design/decisions/K5-the-whole-shape.md: "wallet and the chain, so it is a workflow:" → "wallet and the chain; whether one thing can hold that wait decides if it is a workflow (K46)"
- design/decisions/K5-the-whole-shape.md: "A server call that sends a transaction is a workflow." → "A server call that sends a transaction is more than one call (K46)."
- design/decisions/K17-everything-falls-out.md: "One call commits to one store; anything wider is a workflow (K3)." → "One call commits to one store; anything wider is more than one call, joined by an event (K46)."
- design/decisions/K25-the-blueprint-on-chain.md: "**A contract per organisation (a clone), or the organisation as its own account**: an organisation is not something" → "a chain store may make a contract per instance of its root thing, from a factory (K46); the cost K25 names stands"
