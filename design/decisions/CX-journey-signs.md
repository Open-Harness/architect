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

```ts
s.step("ada signs her claim",
  s.ada.signs`Claim ${s.world.safe} for ${s.ada.person}`,
  expect((a) => a.signer).toBe(s.ada.signer)),
s.step("the claim names ada",
  s.ada.run(claim, { safe: s.world.safe, signature: s.last.signature }),
  expect((a) => a.by).toBe(s.ada.signer)),
```

1. **`s.<name>.signs` is a step's call,** like `run`, `tools()` and `s.clock.advance`. It is a tagged template: its
   literal text and its refs (any ref a payload may hold) make the message, resolved when the step runs. Called with
   one plain string (`s.ada.signs("hello")`) it signs that string. The call is a plain description, `{ kind:
   "sign-call", actor, message }`, where `message` is the template's parts in order, each a string or a ref
   (`ReadonlyArray<string | Ref>`); `prove` resolves the parts with `Scripting.resolve` and joins them, each part as
   `String(part)`. A ref the world never gave fails the step, naming its path (`message: nothing at last.nope`), and
   nothing is signed.
2. **It answers `{ message, signature, signer }`,** which a later step reads as `s.last`: `message` is the exact text
   signed; `signature` is EIP-191 `personal_sign`, `0x` and 130 lower-case hex digits; `signer` is the address that
   signed, EIP-55 checksummed (`Held.address`, as `packages/wallets` answers it). The step's checks (`expect`) read that
   answer, as they read an operation's. Exactly these three fields; nothing else (no key, no label).
3. **`s.<name>.signer` is the address of the cast member's key,** a ref known from the journey's start, before they
   sign: a step may put it in a payload (a Safe's owner) or a check may compare against it, as above. Its path is
   `cast.<name>.signer`.
4. **The key.** Each person in a journey's cast (not the system, a service or the keeper) has one key for that journey:
   the same key for every `signs` of theirs in it, and another key for the same name in another journey, as each journey
   has its own people. It is a world key: made by `prove` for that run from chain-evm's `Keys.generate` (the platform's
   random source, `Redacted` from its first line), never a real key and never one read from the environment. It signs
   through `packages/wallets`' public API: `Server.keystore({ secret, chain })` holds it, and the signer's own `sign`
   makes the EIP-191 signature, so the secret only ever leaves as signatures. A signing step needs no chain: a world
   without one still signs (`chain` is `{ chainId: 31337, rpcUrl: undefined, depth: undefined }`).
5. **No key is ever shown.** Not in the journey's run (its calls, steps and findings), prove's printed lines and its
   structured report (which is what reaches the logbook), any log line, nor any file. A signing step is recorded as a
   call with no trace to wait for, like a clock step: it needs no span and is never failed for telemetry.

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

## Not done here

- **EIP-712 typed data** (`s.<name>.signsTyped({ domain, types, primaryType, message })`) is left until S3 needs it
  (#1166): `wallets`' public `Signer` signs EIP-191 only, so typed data needs a change inside `packages/wallets`, which
  is Goal 18's and goes to it as a Snag when S3 asks. Not checked.
- **Signing in a starting world's `makes`.** A starting world makes calls (`Call | ClockCall`); none of S1's or S3's
  worlds signs. It can follow when one does.
- **An agent's or a key's way in** (`s.ada.via(Via.key).signs`) signs with the same person's key: a way in is how a
  call reaches the server, and a signature reaches none.
