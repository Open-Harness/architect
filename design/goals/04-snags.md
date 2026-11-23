# Goal 4: the snag log

Every snag Goal 4 hits, in the shape the goal file gives (`04-on-chain.md`, "The five roles") and `03-snags.md` uses.
The user (the DX trial) writes one whenever it is stuck on something it can't fix inside `examples/budgets/src/`, and
moves on; it never works around the framework. Snags found by the journey author, the checks author, a builder or a 🔍
reviewer are logged the same way, with "Hit" naming who hit them. A framework builder takes each, check first.

Status is one of `open`, `building` (with its pull request), `fixed` (with the change), or `parked` (with an owner and a
reason). The done check (`nx run e2e:on-chain`) passes only when every entry is `fixed` or `parked`.

Numbers are this log's own, from S-01; they never refer to Goal 3's log.

## S-01 · budgets · "no chain store"
- Hit: the journey author, writing `examples/budgets/blueprint/stores/budgets.ts`: `Blueprint.store.chain.evm()` does not exist (`packages/orthograph/src/modules/stores/types.ts:19` has only `kind`).
- Lost: the blueprint cannot typecheck or compile, so nothing in `examples/budgets` runs.
- Cause: K25 decided the spelling; nothing builds it yet.
- Fix: framework, `Blueprint.store.chain.evm()` and `lives: budgets` on a chain store, slice 3 (M6.10).
- Status: open

## S-02 · budgets · "no account value"
- Hit: the journey author, writing the allowance's `safe`, `member` and `token` and the spend's `to`: `Blueprint.account()` does not exist, and it is not clear whether it is a value or a field type (`Blueprint.value(Blueprint.account())` is written for the payload's `to` and the events).
- Lost: the thing's fields, the payload and the events cannot be declared.
- Cause: `ValueMeta` has no account (`values/types.ts:21-25`); K25 item 2 and M6-chain item 2 decided it.
- Fix: framework, `Blueprint.account()` as a value, CAIP-10 in TypeScript, `address` in Solidity, slice 3 (M6.10).
- Status: open

## S-03 · budgets · "no `who` role"
- Hit: the journey author, writing `treasury` and `grantee` as `Blueprint.role(Allowance, { who: Allowance.fields.safe })`: `Role` has only `rule` (`roles/types.ts:15-20`).
- Lost: no role can be declared that a contract can run.
- Cause: K20's `who` is M2.18's; M6-chain item 5 lets slice 3 build it first if Goal 3 has not.
- Fix: framework, the `who` form, decided on the payload's field of the same name on a creating move, slice 3 (M6.10) or Goal 3's M2.18, whichever lands first.
- Status: open

## S-04 · budgets · "a cast member has no wallet or account"
- Hit: the journey author: a journey needs `s.olga.account` (the account a cast member signs with) and a cast member who holds a wallet but no role (`bob`, the wrong signer, written `Blueprint.anyone`). `Actor` has `person`, `email` and `password` only (`journeys/types.ts`), and `Blueprint.signedIn` is refused on chain (M6-chain item 5).
- Lost: the journeys cannot name who signs, which the done check requires ("each operation signed by its person").
- Cause: nothing gives a cast member a wallet yet. A wallet holder with no role is cast as `Blueprint.anyone` (M6-chain item 10).
- Fix: framework, `Actor.account` and a wallet per cast member made by the world; the runner signs each call with its actor's wallet, and lets an `anyone` cast member sign on chain. Slices 7 and 8, and the checks author's runner work.
- Status: open

## S-05 · budgets · "a journey cannot see a transaction or a token move"
- Hit: the journey author, writing `receipts({ sent, reverted, transfers })`: no such check exists. The wrong-signer journey must show no transaction was sent, and the spend journey must show the Safe paid the token.
- Lost: "refused before anything is sent" and "the Safe pays the token" cannot be asserted.
- Cause: the evidence carries no receipts (`design/frame/examples/allowance-on-chain.md` sketches `receipts({ reverted, sent })`); a token move has no check at all.
- Fix: framework, `receipts` in the evidence and as a check, counted per step, with `transfers` read from the mined transaction's token `Transfer` logs. Slices 7 and 8.
- Status: open

## S-06 · budgets · "a journey cannot replay a signed call or sign with the wrong key"
- Hit: the journey author: "a spend submitted twice" needs `{ signing: "<name>" }` on `run` (the same nonce sent again), and a spend whose signature is bob's but names olga as signer (`BadSignature`, AR-005) cannot be said at all. `run`'s options have only `request`.
- Lost: the replay journey needs an option that does not exist; the BadSignature case is not covered by any journey.
- Cause: a journey step calls the operation once and signs with its actor's key.
- Fix: framework, a `signing` option on `run`, and (if wanted) a way to sign as another actor's key, slice 11 (M6.15) for the replay. `BadSignature` and `SignatureExpired` are reached by the generated Foundry tests in slice 5, not by journeys (M6-chain item 10).
- Status: open

## S-07 · budgets · "no InvalidNonce to refuse with"
- Hit: the journey author, writing `refuses(Blueprint.InvalidNonce, { expected, got })`: `Blueprint.NotAllowed` is the only runtime refusal exported.
- Lost: the replay journey cannot name AR-004.
- Cause: M6-chain item 4 adds AR-003 to AR-006 to the lock; nothing exports them.
- Fix: framework, `InvalidNonce` (and its three siblings) beside `NotAllowed`, slice 3 (M6.10, the lock).
- Status: open

## S-08 · budgets · "no `safe` starting world"
- Hit: the journey author, writing `funded` as `from: "safe"` and reading `s.world.safe` and `s.world.token`: the adapter and its world do not exist, and neither its name nor what it gives is decided.
- Lost: no journey has a Safe or a token to start from.
- Cause: the `safe` adapter is slice 7's; M6-chain says only that its world is a Safe owned by the cast's `ada`, with the module enabled and a token minted to it.
- Fix: framework, the `safe` adapter's starting world, naming it `safe` and giving `safe` and `token`, with the token funded for at least 10_000 base units, slice 7.
- Status: open

## S-09 · budgets · "no way to bind a chain store in an environment"
- Hit: the journey author, writing `blueprint/environments/local.ts`: `stores` takes only a `Database` (`environments/types.ts`), and `Chain.evm.network("anvil")` (K25's spelling) does not exist.
- Lost: the `local` environment cannot say where the budgets store lives.
- Cause: K25 decided `Chain.evm.network(...)`; M6.10 and M6.16 build it.
- Fix: framework, `Chain` in `orthograph`, with an Anvil network the world starts, slices 3 and 12.
- Status: open

## S-10 · budgets · "`emits` cannot check `by`"
- Hit: the journey author, writing `emits(AllowanceSpent, { ..., by: s.olga.account })`: `by` is carried by every chain event but is not one of the event's declared fields, so `emits` has no type for it.
- Lost: a journey cannot say who a chain event says acted.
- Cause: M6-chain item 3 adds `by` and `nonce` to every chain event outside the declared fields.
- Fix: framework, let `emits` check `by` on a chain event, slice 4 (M6.11) and the runner.
- Status: open

## S-11 · budgets · "prove's report doesn't say who signed"
- Hit: the checks author, writing `e2e/on-chain/01-budgets-journeys.test.ts`: the done check requires each operation signed by its person, and `ortho prove --report` has nothing that says who signed a step.
- Lost: check 01 cannot tell a runner that signs every step with one key from one that signs with each actor's wallet.
- Cause: the report's steps carry no actor, signer or receipt; a cast member has no account in the report (S-04).
- Fix: framework, the fields in prove's report: per journey `cast: { <name>: { account } }` (CAIP-10, `eip155:<chain>:0x<40 hex>`, one account per cast member); per step `actor` and `operation`, and for a chain operation `signer: { actor, account }` (the cast member's name and the account that signed) and, when a transaction is sent, `tx: { hash, by }`, `by` the account that sent it. Slice 8 for direct sends and slice 11 for signed ones.
- Status: open

## S-12 · budgets · "a failed payment comes back as success"
- Hit: the lead, reading Goal 7's Safe runs (`spikes/safe-hats-module/evidence/goal-4.txt` on `goal/safe-hats`, commit 149b7dfa, A3): a token whose `transfer` returns `false` still makes the Safe's `execTransactionFromModule` return `true`; a token that reverts makes it return `false` without reverting.
- Lost: a spend that paid nothing would count as spent and emit `AllowanceSpent`, if the generated payment step trusts the Safe's own answer.
- Cause: M6-chain items 1 and 2 put the payment through `execTransactionFromModule` but name no refusal for a payment that fails, and say nothing about the token's own return value.
- Fix: framework, decided in slice 4's decision step and built in slices 4 and 7: the payment goes through `execTransactionFromModuleReturnData`, refuses when the Safe answers `false` or the token answers anything but empty or `true`, and names that refusal in the lock and `surface.json`.
- Status: open
