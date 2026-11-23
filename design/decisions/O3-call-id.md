# O3: the runtime names each call, and the portal groups attempts by that name

Decided 20 November 2026 by the building agent, after a 🔍 reproduced a wrong grouping in the portal's telemetry reader (#182).

## The problem, in code

The reader grouped an operation's attempt spans into calls by position: attempt `n` joined the call whose last attempt was `n - 1`.

```ts
// packages/language-effect/src/modules/handler/service.ts: one call's attempts run one after another, in a loop
const loop = (number: number) => attempt(payload, principal, key, number).pipe(Effect.catch((e) => e instanceof Conflict && number < ATTEMPTS ? loop(number + 1) : …));
```

Attempts of one call are sequential, but different calls' attempts overlap, and under a sent traceparent every call's attempts share the caller's
span as their parent (`projections/.../server.ts:207`). The idempotency key is not on a span. So with A1 (loses its commit) at t0, B1 (wins) at t2 and A2
at t20, attempt 2 attached to B's call: the reader showed an invented defect and dropped a move, where the truth is two answered calls, A with two
attempts, and two moves. Nothing in a trace says which attempts belong together.

## The decision

- **The attribute is `call.id`.** No decision (K12, O1, O2, G8) reserved a name for it. It is made once per call, before its first attempt, from Effect's own
  `Random` through `Ids.make("call")` (`call_` and 16 base-36 characters, so a world can seed it; no `Math.random`, no clock), and written on every attempt span
  of the call (`<op>`), on the door's `<op>.refused` span, and on the one operation span of a read and of a device call.
- **The portal groups by it** (`portal/.../telemetry/internal/group.ts`). Reads and device calls need nothing more: one span, one call.
- **The fallback, for spans without it** (older runs, check 21's fixtures): attempt 1 starts a call; attempt `n` continues a call whose last attempt was `n - 1`
  and could still be followed (it was not refused, did not die, and did not win its commit: a conflict, or a trace that says nothing, can be followed). Exactly
  one such call: the attempt joins it. None: it is a call of its own. More than one could take it: the reader does not guess. Those calls and the attempt are one
  call whose `outcome` is `unknown`, and which counts no move. `unknown` is a fourth `Outcome` on the portal's wire; `ortho.calls` still gives the true counts.

## Cost

One extra `Random` draw per call, before its first attempt. Tests that seed `Random` and assert the generated ids of an instance made inside a handler would see
the draw first; none does today (language-effect's and the portal's tests pass).
