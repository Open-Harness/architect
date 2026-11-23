# Budgets journeys (Goal 4, slice 2, M6.02)

Written by the journey author, against `design/decisions/M6-chain.md` and K25. Builders never edit these files, the starting
worlds or the blueprint. They are the spec: a correct implementation makes every step green, and an empty one turns every
step red. None can run yet: each needs framework pieces slices 3 to 8 build, and `design/goals/04-snags.md` (S-01 to S-10)
names each missing piece and the slice that builds it.

## Starting worlds

| World | From | Makes | Gives |
|---|---|---|---|
| `funded` | the `safe` adapter's world (slice 7) | nothing of its own | `safe`, `token`: a Safe owned by ada, the budgets module enabled, the token minted to it |
| `granted` | `funded` | ada, as the Safe, grants olga 500 | `safe`, `token`, `allowance` |

## Journeys

| Journey (file) | World | Cast | Steps | Proves |
|---|---|---|---|---|
| `a Safe grants a member an allowance` (`grant-an-allowance`) | `funded` | ada the Safe, olga, a reader | 2 | the grant answers an `alw_` id, emits `AllowanceGranted`, is `active`, one transaction sent; anyone reads it: limit 500, spent 0 |
| `only the Safe grants` (`only-the-safe-grants`) | `funded` | ada, bob, olga | 3 | bob and olga naming the Safe are refused `NotAllowed`, no event, no transaction sent; the Safe's grant then goes through |
| `a member spends within an allowance` (`spend-within-allowance`) | `granted` | olga, a shop | 3 | olga signs 120: remaining 380, `AllowanceSpent` by olga, the Safe pays 120 of the token to the shop; 80 more leaves 300; the row shows 200 spent |
| `a wrong signer is refused before anything is sent` (`a-wrong-signer-is-refused`) | `granted` | olga, bob | 5 | bob's spend refused `NotAllowed`, no transaction; an allowance that isn't there is `NotAllowed` on spend and `AllowanceNotFound` on get; nothing spent; olga's spend still goes through |
| `revoke then spend` (`revoke-then-spend`) | `granted` | ada, olga | 4 | olga can't revoke; ada revokes; olga's spend is refused by the machine (`notFrom`, state revoked), nothing sent; a second revoke refused the same way |
| `a spend submitted twice lands once` (`spend-twice-with-one-signing`) | `granted` | olga, a shop | 4 | the same signed spend sent again is refused `InvalidNonce { expected: 1, got: 0 }` (AR-004), nothing sent, 100 spent, confirmed once; the same payload signed afresh is a new spend |
| `a spend over the limit is refused` (`spend-over-the-limit`) | `granted` | ada, olga, a shop | 5 | 501 of 500 refused `AllowanceExceeded { remaining: 500 }`, nothing sent; exactly 500 exhausts it and the Safe pays 500; 1 more refused by the machine (exhausted); an exhausted allowance can be revoked |

## The six proofs of the author skill, today

Proofs 1 to 3 need a runnable framework, so none can be run today and none is faked. Proof 4 (agrees with the suite) holds
by reading: no two journeys disagree, and the grant, spend and revoke expectations match across them. Proofs 5 and 6 wait
for the checks that read these journeys.

| Journey | 2 can pass | 3 a journey can reach it | Runnable from |
|---|---|---|---|
| grant an allowance | a handler-free contract: needs the chain store, roles, the `safe` world | `NotAllowed`, `AllowanceGranted` | slice 7 (Safe and Anvil), with slice 8's client |
| only the Safe grants | same | `NotAllowed` before sending (simulation) | slice 8 |
| spend within | the scaffold's `_spend` filled in; the Safe pays through the adapter | the token move | slice 7 (a spend pays from the Safe), slice 8 (the SDK) |
| wrong signer | same | `NotAllowed` from the simulation, no transaction | slice 8 |
| revoke then spend | same | the machine's refusal on chain | slice 7 |
| submitted twice | the signed entry and a nonce | `InvalidNonce` (AR-004) | slice 11 (M6.15); the nonce path also from slice 8 |
| over the limit | the user's `_spend` | `AllowanceExceeded`, exhausted | slice 6 (the hook, M6.13), runnable at slice 7 |

## Not covered

- A signature that is bob's but names olga as signer (`BadSignature`, AR-005): no cast member can forge (S-06).
- A deadline that has passed (`SignatureExpired`, AR-003): time on chain is M6.21's.
- Unordered or several in-flight nonces: later (M6-chain item 1).
- `allowance.get` through the follower's view (slice 10): the same step, a different source.

## Questions for the lead

These are where M6-chain is ambiguous for something written here. Each is answered by a line in the blueprint or a journey.

1. **How does `ada` act as the Safe?** `cast: { ada: treasury }`: the role is the Safe's account, but a Safe signs through its owners. M6-chain leaves it to slice 7 (ERC-1271 signature, or a Safe transaction calling the direct entry). Written as if ada simply acts as the Safe.
2. **What is `s.olga.account`, and what is a wallet-holder with no role?** Written `s.<name>.account`, and `Blueprint.anyone` for bob, olga-before-grant and the shop, since `signedIn` is refused on chain (S-04).
3. **What does `receipts` count?** Written per step (`sent`, `reverted`) with a `transfers` list for the token. The frame doc has only `{ reverted, sent }` (S-05).
4. **How does a journey send the same call twice?** Written as `{ signing: "name" }` on `run` (S-06). With the nonce an argument of both entries, naming it twice sends the same nonce twice.
5. **What is the `safe` adapter's world called, and what does it give?** Written `from: "safe"`, giving `safe` and `token`, with the token minted generously (S-08).
6. **Is `Blueprint.account()` a value or a field type?** Fields use it directly, as K25 shows; the payload's `to` and the events use `Recipient = Blueprint.value(Blueprint.account())` (S-02).
7. **Where is `Chain` imported from?** Written `import { Chain } from "orthograph"`, `Chain.evm.network("anvil")` for `local` (S-09).
8. **Which `identity` does a chain environment have?** Written `Identity.testPrincipals` as in Plugged In, though a cast with wallets may replace it.
9. **Is MCP left out of budgets?** Yes, per the frame doc; the `mcp` projection is not declared.
10. **Can `emits` check `by`?** Written `by: s.olga.account` on a spend's event (M6-chain item 3 adds it to every chain event), outside its declared fields (S-10).
