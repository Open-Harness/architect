# G8: a call the role refuses is traced in `<operation>.refused`, and a move is written on the operation's span

Decided 19 November 2026 by the Goal 3 lead, built by the framework builder of PR #148, under "Who decides" in `AGENTS.md`.

## The problem

Three grid cells were red for telemetry (K12 §2, M1.36): `error.telemetry` for `NotAllowed` ("no span has refusal=NotAllowed: the refused call
was not traced"), `journey.telemetry` for two journeys (their spans cover fewer steps than the journey ran, because refused steps left no span
for prove's `journey.<name>` root to cover), and `machine.telemetry` for `handle` and `link` (`move.name` and `move.to` on the step's span).

```ts
// packages/language-effect/src/modules/handler/service.ts, before: the role check ran before any span opened
yield* Access.check({ ... }).pipe(withRecords, Effect.withTracerEnabled(false));
return yield* Effect.gen(function* () { ...handler... }).pipe(spanned(name, { operation: name, ... }));

// packages/language-effect/src/modules/handler/internal/move.ts, before: the current span is the step's, when the handler moves in a step
yield* Effect.annotateCurrentSpan({ "move.name": op.move.key, "move.to": String(outcome) });
```

The journeys of Plugged In say the opposite of the obvious fix: a refused call must leave **no span named for the operation**.

```ts
// examples/plugged-in/journeys/a-stranger-cannot-edit-a-page.ts:38
spans({ absent: ["link.remove"] }),
```

## The options

**A. Open the operation's span before the role check.** The refused call is traced as `link.remove`. Rejected: it fails seven journey steps
(`a stranger cannot edit a page`, `release a handle`) and turns `error.server` and `journey.model` red, which the grid showed when tried.

**B. No span for a refused call.** Today's behaviour. Rejected: `error.telemetry` stays red, and prove's journey root has nothing to cover.

**C. A span named `<operation>.refused` (chosen).** The operation did no work, so its span stays absent, and the refusal is still traced:

```ts
Access.check(...).pipe(withRecords, Effect.withTracerEnabled(false), Effect.tapError(refused(principal, number)))
// refused: Effect.annotateCurrentSpan({ refusal, "refusal.code" }) in spanned(`${name}.refused`, { operation, attempt, "principal.kind" })
```

## The call

C. The span carries `refusal`, `refusal.code`, `operation`, `attempt` and `principal.kind`. It does **not** carry `principal.person`: with it, the
private-field check of `packages/prove/src/modules/prove/secrets.test.ts` found bob's person id, which is a private `payload.member` value, on
a span of `allowance.grant` (M1.35's one visibility rule). A refused caller is named by kind only: F8 (row 4) and O2 keep which person called off any span a viewer reads, and a refused call is the one a stranger makes.

The move's attributes go on the operation's span: `chooseOutcome` takes that span as an argument and writes `move.name` and `move.to` on it, so a
move made inside a step lands in the same place as `move.from`.

## Evidence

- `e2e:grid` before: 5 telemetry pairs red (listed in `e2e/grid/expected-red.json`); after: they are green and removed, `ratchet ✔ 72 expected red, 0 unexpected, 0 newly green`.
- Trying A: `error.server NotAllowed`, `journey.model` for both journeys and their steps went red ("span link.remove present, expected absent").
- Plugged In's seven journeys, 56 of 56 steps, green with C.
- Tests: `handler.test.ts` (a refused call's span carries `refusal`, `refusal.code` and `operation`, the handler never ran; a move inside a step is on the operation's span), `call-metrics.test.ts` (the stranger's trace is exactly `allowance.spend.refused`).

## Supersedes

- docs/canon/traces.mdx: "a caller the role refuses before the span opens" → "a caller the role refuses"
- design/docs/index.html: "Calls refused before any span, a bad payload or a wrong role, are still counted:" → "A bad payload is refused before any span, and a wrong role in its own <code>&lt;operation&gt;.refused</code> span; both are still counted:"
