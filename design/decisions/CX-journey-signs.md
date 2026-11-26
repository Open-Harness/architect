# CX-journey-signs: a journey's actor signs a message

**Decided 26 November 2026** by Goal 16's ✍️ author for J1 (#1190), started by the money lane's 🧭 lead. It adds to
the journey language, so it is recorded here before the checks. The checks are
`packages/orthograph/src/modules/journeys/signs.test.ts` and `packages/prove/src/modules/journeys/signs.test.ts`.

## The gap

A journey's payloads are literal values or refs (`s.world.x`, `s.<name>.person`, `s.last.x`), resolved by `prove`
once the world has said them (`packages/orthograph/src/modules/journeys/internal/refs.ts`). A cast member can call an
operation (`run`), list tools (`tools`), or have the clock moved, but cannot sign. S1's claim (#1168) and S3 (#1170) need
the person's own key to sign an EIP-191 message whose text holds run-time ids (`saf_…`, `per_…`), so no fixed
signature in a journey file can stand in.

## The surface

S1's claim text is CX-safe-machines' (section 3, on `goal-16/safe-machines`): EIP-191 only, one line, no trailing
newline, `Capxul: claim Safe <saf_…> for <per_…>`. S1's author asked for the parts array, `s.<name>.signer`, signing
in a starting world and deterministic signatures (26 November 2026); each is below.

```ts
s.step("ada signs her claim",
  s.ada.signs`Capxul: claim Safe ${s.world.safe} for ${s.ada.person}`,
  expect((a) => a.signer).toBe(s.ada.signer)),
s.step("the claim names ada",
  s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }),
  expect((a) => a.by).toBe(s.ada.signer)),
```

1. **`s.<name>.signs` is a step's call,** like `run`, `tools()` and `s.clock.advance`. It is a tagged template: its
   literal text and its refs (any ref a payload may hold) make the message, resolved when the step runs. Called with
   a parts array (`s.ada.signs(["Capxul: claim Safe ", s.world.safe, " for ", s.ada.person])`) it is the same message,
   the parts joined with nothing between them; called with one plain string (`s.ada.signs("hello")`) it signs that
   string. The call is a plain description, `{ kind:
   "sign-call", actor, message }`, where `message` is the template's parts in order, each a string or a ref
   (`ReadonlyArray<string | Ref>`); `prove` resolves the parts with `Scripting.resolve` and joins them, each part as
   `String(part)` (a number or bigint as its digits, an object as `String` gives it), and signs the result as it is: no
   trimming, no newline or Unicode normalising. A ref the world never gave fails the step, naming its path (`message: nothing at last.nope`), and
   nothing is signed. A cast member with no key (the system, a service, the keeper) fails the step, naming them and that
   they have no key.

   **In a starting world too.** A starting world's `makes` may hold a sign call, as S1's claimed worlds need: `s.last`
   moves to its answer, so the next call of `makes` reads `s.last.signature`, as in a journey. A world's sign that
   fails stops the journey, as a world's failed call does (`starting world <name>: message: nothing at …`).
2. **It answers `{ message, signature, signer }`,** which a later step reads as `s.last`: `message` is the exact text
   signed, exactly, each part as its text (spaces and newlines as written); `signature` is EIP-191 `personal_sign`, `0x` and
   130 lower-case hex digits, its last byte the `v` of 27 or 28 (`1b`, `1c`) that `ecrecover` and a Safe read as a key's
   signature, and low `s`: exactly what the key gives under RFC 6979, as every Ethereum signer does; `signer` is the address that
   signed, EIP-55 checksummed (`Held.address`, as `packages/wallets` answers it). Signing is deterministic (RFC 6979,
   as `wallets`' signer already is): one key and one text give one signature, so a replayed claim under its request key
   carries the same proof and is no `IdempotencyConflict`. The step's checks (`expect`) read that
   answer, as they read an operation's. Exactly these three fields; nothing else (no key, no label).
3. **`s.<name>.signer` is the address of the cast member's key,** a ref known from the journey's start, before they
   sign: a step may put it in a payload (a Safe's owner) or a check may compare against it, as above. Its path is
   `cast.<name>.signer`.
4. **The key.** Each person in a journey's cast (not the system, a service or the keeper) has one key for that journey
   run:
   the same key for every `signs` of theirs in it and in its starting worlds' `makes`, and another key for the same name
   in another journey, as each journey has its own people; a second run of the same journey (another `ortho prove` in
   one process) is other people again, with new keys, never a cache. It is a world key: made by `prove` for that run from chain-evm's `Keys.generate` (the platform's
   random source, `Redacted` from its first line), never a real key and never one read from the environment. It signs
   through `packages/wallets`' public API: `Server.keystore({ secret, chain })` holds it, and the signer's own `sign`
   makes the EIP-191 signature, so the secret only ever leaves as signatures. A signing step needs no chain: a world
   without one still signs (`chain` is `{ chainId: 31337, rpcUrl: undefined, depth: undefined }`).
5. **No key is ever shown.** Not in the journey's run (its calls, steps and findings), prove's printed lines and its
   structured report (which is what reaches the logbook), any log line at any level, the process's environment, nor any
   file. A signing step asks the world
   nothing over HTTP. It is recorded in the run's `calls` as one `CallRecord` with the step's title as `step`, the
   signer as `actor`, `status` 200 and the answer as `body`, marked `signs: true`; like a clock step it has no trace to
   wait for, so it needs no span and is never failed for telemetry.

## Why this shape

- **A step's call, not a payload value.** A signature is something the actor does, at a moment, after earlier steps
  have made the ids it names; a value inside `run`'s payload would sign before the step's own answer exists and hide
  who signed. As a step it is recorded, its answer is `s.last` like any call's, and checks read it the usual way.
- **A tagged template, not a function of the answer.** Journeys are plain descriptions (`journeys/README.md`); a
  callback would run journey code against run-time values. A template is data: literal parts and refs, which `prove`
  already knows how to resolve.
- **`signer` as an address, not CAIP-10.** EIP-191 signatures carry no chain, and the recovered signer is an address;
  that is what a Safe's `swapOwner` and S1's claim compare. When a world gives a cast member a chain account (M6-chain
  item 10, `s.<name>.account`, not built), the key that signs is that account's key, so `s.ada.account` ends in
  `s.ada.signer`. That join is not checked here, since no world gives accounts yet.
- **`prove` makes the key, through `wallets`.** `packages/wallets` owns signing (Goal 18's); `prove` uses its public
  `Server.keystore` and chain-evm's public `Keys`, changing neither. A key per journey per person keeps journeys apart
  as their people are.

## A way in

`s.ada.via(Via.key).signs(...)` is ada signing, with her own key: a way in is how a call reaches the server, and a
signature reaches none.

## Not done here

- **EIP-712 typed data** (`s.<name>.signsTyped({ domain, types, primaryType, message })`) is left until S3 needs it
  (#1166): `wallets`' public `Signer` signs EIP-191 only, so typed data needs a change inside `packages/wallets`, which
  is Goal 18's and goes to it as a Snag when S3 asks. Not checked.

## How it is built (J1's builder, 26 November 2026)

- `@orthograph/wallets` exports only its `dist` (it ships built JavaScript, M1-plugins section 1, and its source imports
  its blueprint by `.js` paths that only a bundler or `tsc` follows). So `prove` loads `@orthograph/wallets/server` when a
  journey first signs, by a specifier `tsc` does not follow, with `Server.keystore`'s shape written out in
  `packages/prove/src/modules/journeys/internal/signing.ts`. A project that never signs, and `ortho` run from source in
  a workspace where `wallets` is not built, need nothing of it; a sign step there fails, saying to run `nx build wallets`.
  prove's `test` target builds `wallets` first (`packages/prove/project.json`), so CI's `prove-tests` have it.
- A key is made lazily, the first time its person signs or a step's call or checks name their `s.<name>.signer`, so
  journeys that never sign make no key and load no `wallets`.
- A sign step that fails (no key, a ref the world never gave) is recorded too, status 422 and
  `{ _tag: "NotSigned", message }`, marked `signs: true`, so the printed lines wait for no span for it; its checks are not
  run, and the step's one failure is what stopped it.
