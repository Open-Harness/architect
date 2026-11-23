# Example: proving membership without revealing who

Part of the frame's worked examples ([`../README.md`](../README.md)). Proposed, 17 November 2026. Grounded in the two
Noir spikes (`design/noir/spike-1-member-note.md`, `design/noir/spike-2-role-gate-e2.md`) and the decision that
places Noir after Gate 5 (`design/decisions/N1-noir-target.md`). **This is the furthest-out example**: nothing here is
scheduled before layer 5 is on `main`.

**Now stage 4 of the growing example** (K9, 18 November 2026): the members-only club on Aztec, with private
ballots and private budgets, inside v1.0 (ST4.01 to ST4.08).

**Languages: Effect and Noir.** "Language" is the axis that was called "target" before (Effect, Solidity, Noir,
Python), packaged as `@orthograph/language-noir`. The host is `Host.chain` (Aztec) for the contract and the caller's own
device (`Host.node` or `Host.browser`) for the proof; the projection is the private contract plus its client.

## The idea

An organisation has a shared pool of money. Any member may spend from it, up to a monthly limit. Nobody watching the
chain, and not acme's server either, learns *which* member spent. The member proves "I am a member of this
organisation and the pool allows this" on their own device; the chain checks the proof and never sees who.

Spike 2 ran exactly this on Aztec 5.3.0: a `RolePool` contract where membership is a marker,
`marker = poseidon2(member, salt)`, held in `DelayedPublicMutable<u8, 3600>`, and `spend` reads it privately.

## The description

What the description must say, and the primitives N1 lists that it doesn't have yet (`visibility` and `runs` exist
since L2.P; `custody` and `takesEffect` do not):

```ts
// blueprint/things/pool/thing.ts
export const Pool = Blueprint.thing({
  description: "Money an organisation's members spend from, without saying who.",
  fields: {
    id: Blueprint.id("pol"),
    organization: Organization.fields.id,
    limit: Amount,
    spent: Blueprint.field(Amount, { visibility: "private" }),
  },
  lives: rolePool,   // blueprint/stores/role-pool.ts: Blueprint.store.chain.aztec(), K25
});

// blueprint/things/pool/verbs/spend.ts
export default Blueprint.operation(Pool, {
  payload: { pool: Pool.fields.id, amount: Amount, to: Blueprint.field(Address, { visibility: "private" }) },
  move: machine.moves.spend,
  errors: [PoolExceeded],
  allowed: [member.of("organization")],            // proved, not checked by a server
  runs: "client",                                   // the proof is made on the caller's device
  custody: "caller",                                // the caller's keys never leave the device (not yet a primitive)
  budget: { p95: "15 seconds" },                    // spike 1: proving 7.5–10 s, a whole operation 12–15 s
});

// blueprint/things/pool/verbs/remove-member.ts: takes effect after a delay, visibly
export default Blueprint.operation(Pool, {
  payload: { pool: Pool.fields.id, member: Person.fields.id },
  allowed: [owner.of("organization")],
  takesEffect: { after: "1 hour" },                 // spike 2's DelayedPublicMutable delay (not yet a primitive)
});
```

`runs: "client"` is the first operation whose behaviour runs on the caller's host. The compiler refuses it today
(`runs` accepts only `server` until a language supports another, N1 decision 3).

## Journeys

In prose:

1. Olga, a member, spends 50 from the pool. The pool's spent goes up by 50. Nothing in the evidence names olga.
2. Bob, not a member, tries to spend. He can't make a valid proof; the chain rejects it.
3. Olga proves two spends from the same state and sends both. The second is rejected with `Existing nullifier`.
4. Ada removes olga. A spend olga proved before the removal took effect is rejected once it is in force.
5. A spend that would go over the month's limit is refused, with the same refusal code as the Effect machine's.

What a journey **can** check here is different, and that is the instructive part:

| It can check | It can't check |
|---|---|
| the answer or the refusal code | which member acted (that is the point) |
| that the pool's public state moved | the private fields, except from the acting member's own device |
| that no private value appears in spans or logs (the leak check: spike 1 found none in 150 spans at `info`) | that a verifying network accepted the proof, locally: the local network runs with `realProofs: false` |
| the nullifier refusal on a double spend | |

```ts
s.step("olga spends without being named", s.olga.run(spend, { pool: s.world.pool, amount: 50n, to: s.olga.address }),
  publicState(s.world.pool, { spent: "increased" }),
  leaks({ none: [s.olga.person, s.olga.address] }),   // no private value in spans, logs or events
  spans({ present: ["pool.spend.prove", "pool.spend.submit"] })),
```

## Blanks and handlers

Two blanks, in two languages. The Noir contract's private function (from the scaffold `src/RolePool.nr`) holds the
limit check over private notes. The Effect client, generated over Aztec's artifact, has one step spike 1 found missing:
**sync before proving**. The member's device must catch up with the chain first, or the next move proves against stale
state. That step belongs in the generated client, not in a handler.

## Adapters and secrets

- **Adapter**: Aztec's network, with its PXE (the private execution environment on the caller's device). Stand-in:
  Aztec's local network, `Stand.process`, with the honest label that it does not verify proofs.
- **Secrets**: none on the server. A member's keys are custody `caller` and never reach acme. A fee payer
  (sponsored fees) would be a runtime secret, and is unvalidated: spike 1 found that paying your own fee leaks who sent
  it.

## Where data lives

| Data | Lives | Seen by |
|---|---|---|
| the pool's limit and public totals | on chain, public | anyone |
| each member's notes, the marker salt | on chain, private, and on the member's device | that member |
| who is a member | the organisation actor (acme's record) and, as markers, the contract | acme and the owner |

The organisation actor knowing who the members are is fine. What no one learns is which member did what.

## Projections and what gets generated

- **noir** (projection over `@orthograph/language-noir`): types, events and refusals; the compiled machine over private
  notes; the scaffold; conformance tests in the TXE. Spike 1 ran all of these: 22 conformance tests pass, and a planted
  wrong test fails as it should.
- **sdk**: an Effect client over the artifact, including the sync step. Browser proving is untested.
- **server**: the non-private operations (create a pool, add a member), as today.
- **mcp, cli**: the private spend is out of MCP; the CLI can carry it only on a device holding the member's keys.

## Proof

Locally: TXE conformance, the leak check, and journeys on the local network, all labelled "proofs not verified". The
cloud pass adds a network that verifies proofs, and only there is `pool.spend` fully proved.

## Today vs proposed

| | Today (`origin/layer/3`) | Proposed (after Gate 5) |
|---|---|---|
| Noir | none; a later language (N1 decision 1, `design/later.md`) | `@orthograph/language-noir` plus the noir projection |
| `visibility` | built in L2.P, defaulting to `public` | used for private fields, payloads and the leak check |
| `runs: "client"` | the field exists; only `server` is accepted (N1 decision 3) | accepted for languages that prove on the caller's host |
| `custody`, `takesEffect` | not taken (N1 decision 4) | primitives, each proved by a chain language first |

## Questions this raised

1. **Is `leaks({ none })` a journey check or an eval?** (a) A tenth built-in eval, run on every operation with a
   private field. (b) A journey check, written where it matters. *Recommend (a)*: privacy shouldn't depend on someone
   remembering to check it.
2. **Where does `custody` get proved first?** (a) In Solidity with the wallets feature (the caller's key, never the
   server's), so Noir inherits it. (b) Only when Noir arrives. *Recommend (a)*: each wallet declaring where its key lives
   (K7 F5) is already custody in all but name.
3. **How do we label a proof the local network didn't verify?** (a) The verdict carries "proofs not verified", and
   `promote` to production requires a verdict from a verifying network. (b) Treat local as enough. *Recommend (a)*.
