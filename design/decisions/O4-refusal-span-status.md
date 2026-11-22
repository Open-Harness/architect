# O4: a refusal's span is not an error; "ends ok" means a successful exit, exported as UNSET

Decided 21 November 2026 by the lead of Goal 3, after check 39's own control (M1.49) failed in CI when `goal/stage-1` was merged in: "a refusal ends ok: expected +0 to be 1".

## The problem, in code

Our handler ends a refusal as a successful exit, by turning the failure into a value inside the span and failing again after it:

```ts
// packages/language-effect/src/modules/handler/internal/span.ts: spanned
work.pipe(
  Effect.result,
  Effect.withSpan(name, { attributes }),
  Effect.flatMap((outcome) => (Result.isFailure(outcome) ? Effect.fail(outcome.failure) : Effect.succeed(outcome.success))),
);
```

Until `effect` 4.1.1 the OTLP exporter wrote a successful span exit as status code 1 (`Ok`). `effect` 4.1.4 (#302) writes it as 0 (`Unset`). The whole change to the
tracer, `effect/src/observability/OtlpTracer.ts` `makeOtlpSpan`, from the 4.1.1 and 4.1.4 tarballs (`npm pack effect@4.1.1`, `npm pack effect@4.1.4`, then
`diff -u` of the two files; no other line of the file differs):

```diff
@@ -328,7 +328,7 @@
   if (status.exit._tag === "Success") {
-    otelStatus = { code: StatusCode.Ok }
+    otelStatus = { code: StatusCode.Unset }
   } else if (Cause.hasInterruptsOnly(status.exit.cause)) {
@@ -341,7 +341,7 @@
     otelStatus = errors.length > 0
       ? { code: StatusCode.Error, message: errors[0].message }
-      : { code: StatusCode.Ok }
+      : { code: StatusCode.Unset }
```

So a refusal's span, and every span that exits successfully, is exported as 0. A defect is still exported as 2 (`Error`). Check 39's control asserted 1.

## The decision

- **"Ends ok" now means a successful span exit, which the exporter writes as OTLP `UNSET` (0), and never `ERROR` (2).** O1's "Refusals are never errors" and O2's
  "Refusals end OK and defects end in error" keep their meaning: a refusal is not red, is not sent to error tracking and is not in "Top Errors". `UNSET`
  satisfies all of it. The wording in live docs changes to "does not end as an error".
- **Check 39's control asserts `status` is not 2** on the refusal's span (`not.toBe(2)`), keeps the `refusal` attribute assertion, and keeps `2` on the
  defect's call span and the failing step's span. Its title says "ends a refusal not as an error".
- **We do not restore `OK`.** Three reasons:
  1. The OTLP tracer has no status hook: `makeOtlpSpan` picks the code from the exit alone, so restoring `OK` means a custom exporter, or a patch of `effect`, to
     put back one number nothing reads.
  2. The upstream change looks deliberate: it changes both `Success` branches, and the interrupt branch already wrote `Unset`. The OpenTelemetry convention is that
     instrumentation leaves a successful span `Unset` and only an application that wants to assert success sets `Ok`.
  3. Nothing reads `OK`. No check, journey or reader needs it (a grep of `e2e/` and `packages/` for a span status of 1 or `StatusCode.Ok` finds none; every other
     `status ... toBe(1)` is a process exit code). Axiom's source maps any code other than 2 to 0 (`packages/prove/src/modules/telemetry/axiom-source.ts:34`), so
     the portal already read an `OK` span and an `UNSET` span the same way.

## Cost

A sink that colours or counts `OK` spans (a viewer's "green" status) sees none. The only reader in this repository, `axiom-source.ts`, is unaffected. The runtime
comment in `internal/span.ts` ("ends ok") still says the old word; it is the builder's file, and the sentence stays true as "exits successfully".

## Supersedes

- .agents/skills/visuals/SKILL.md: "an outcome: its span ends ok" → "an outcome: its span does not end as an error"
- .agents/skills/trace-waterfall/SKILL.md and spikes/visual-content/scenes/trace-waterfall.js: "every span ends ok;" → "no span ends as an error;"
- design/docs/index.html: "a declared outcome, ends OK" → "a declared outcome, never ends as an error"
- docs/canon/invariants.mdx: "The span ends OK, and carries" → "The span does not end as an error, and carries"
- docs/canon/operations.mdx: "and the span ends OK (see" → "and the span does not end as an error (see"
- docs/canon/traces.mdx: "Refusals end OK, defects in error" → "Refusals never end as errors, defects do"
