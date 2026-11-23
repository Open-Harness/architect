# O2: three gaps in what a call leaves behind, and their fixes

Decided 18 November 2026, by the building agent under "Who decides" in `AGENTS.md`. Found while explaining spans to
Aaron from the handler wrapper's code. He asked that each gap be written down with how it will be fixed ("make sure
this is noted down so we know what needs to be fixed and how we're going to fix it"). This record extends O1. It
doesn't replace any of it.

## What a call leaves today

You never write span code. The declaration produces the spans:

- **The operation's span**, named after it (`spend`). It opens only once the role check has passed:
  `spanned(name, { operation: name, ...principalAttributes(principal) })` at
  `packages/language-effect/src/modules/handler/service.ts:83`.
- **One span per declared step**, `<operation>.<step>`, tagged `step.kind`, at `service.ts:34`.
- **Attributes come from the declaration.** Only public fields are written: `payload.*`, `answer.*` and
  `principal.person`. A field the declaration doesn't name is never written (`internal/attributes.ts`).
- **Refusals end OK and defects end in error** (Superseded by O4, 21 November 2026: a refusal's span exits successfully and is exported as OTLP UNSET, never ERROR; a defect is still ERROR) (`internal/span.ts`). A refusal is tagged `refusal` and `refusal.log`.
  Only a defect is red.

## Gap 1: the commit has no span

**The problem.** `store.commit(...)` at `service.ts:71` runs inside the operation's span but not as a span of its own.
A slow D1 write, or a commit that lost its version race, shows only as a longer `spend`. A rerun after `Conflict` shows
as a second `spend` span next to the first, with nothing saying why.

**The fix.** The commit becomes a span, `<operation>.commit`, tagged `step.kind: "commit"`, with:
- `commit.writes` and `commit.entries`, as counts, never values;
- `commit.outcome`, which is `committed` or `conflict`.

The operation's span also carries `attempt` (1 to 64), so a race reads as `attempt=2` with the first attempt's commit
showing `conflict`.

**Proved by** a handler test that forces one conflict and asserts both spans and both attributes, and a journey that
asserts `spans({ present: ["allowance.spend.commit"] })`.

## Gap 2: free text is traced by default

**The problem.** Visibility is public by default (`packages/forman/src/modules/visibility/types.ts:1`), and public
fields become span attributes. So acme's `memo` ("lunch", "hotel") is written to every trace, and so is anything a
person types into a text field. That is where personal details turn up.

**The fix.** Tracing is narrowed for one kind of value only: **free text is not traced unless it is marked.**
- A public `Blueprint.text()` value is still answered to callers and kept in events as before. It is simply never
  written as a span attribute or a log annotation.
- To trace one, mark it `Blueprint.traced(Memo)`.
- Ids, amounts, enums, booleans and times stay traced when public. They are what you search traces by, and they
  don't carry what people type.
- Secret and private fields are unchanged: never traced.

No journey changes. `spend-within-allowance` still asserts `memo` on `AllowanceSpent`, because events keep the field.

**Proved by** the attributes test (`internal/attributes.test.ts`) asserting that `payload.memo` is absent and that a
traced text field is present, and by the "leaks nothing" part of the answer-shape eval (S28, D3 #83) checking spans
and logs for untraced text. `prove` reads the same declarations as the handler, so the text marker applies to both.

## Gap 3: refusals before the span leave no count

**The problem.** A payload that fails to decode (`InvalidPayload`, `service.ts:104`) and a caller the role refuses
(`NotAllowed`, `Access.check` at `service.ts:46`) leave no span. That is deliberate: a refused caller must never look
like work. But it also means nobody can see that `spend` refused 400 strangers in an hour.

**The fix.** Every call is counted as a metric, whether or not a span opened:
- `ortho.calls`, a counter, tagged `operation`, `outcome` (`answered`, `refused` or `defect`), `refusal` (the tag)
  and `principal.kind`. It carries no payload values and no person.
- `ortho.call.duration`, a millisecond histogram per operation, for comparing against the declared budget
  (`budget: { p95: "150 millis" }`).

Both go through Effect's `Metric` to OpenTelemetry, into the `<project>-<env>-metrics` dataset O1 reserved. Axiom routes
the signal using `x-axiom-metrics-dataset`. Locally the Collector writes `metrics.jsonl`.
[Axiom's OTLP documentation](https://axiom.co/docs/send-data/opentelemetry)

The wrapper measures one call across its retries, using the monotonic clock. The HTTP API and MCP can reject a payload
before invoking the wrapper, so their decoders count those refusals. The HTTP API suppresses its automatic request
span and keeps the caller's trace context for the operation span after access succeeds. `prove` accepts an empty trace
for an independently predicted `NotAllowed` response when the journey requires no spans to be present. The Worker
exports its request's metric deltas once, when its telemetry runtime closes.

**Proved by** a world test that sends one bad payload and one stranger, then reads `ortho.calls` and
`ortho.call.duration` from the Collector: two refusals, two duration observations, and no spans for either call.

## What to look for in a trace (for the docs page)

- Red is a defect, and only a defect. Refusals are tagged, not red.
- A missing child span shows where the call stopped: `spend.load` without `spend.record` means it was refused after
  the read.
- `attempt` above 1, with `commit.outcome=conflict` before it, is a version race. Many of them mean contention on one
  thing.
- `request.replayed=true` is a retry that changed nothing.
- Each step's width against the operation's budget shows which step is slow.

## Where it lands

M1.18 (gap 1), M1.19 (gap 2) and M1.20 (gap 3), all in parallel, each one slice ending in its proof above.

## Builder-edited checks, audited (lead, 18 November 2026)

M1.19 and M1.20's builder also changed the evals (`packages/prove/src/modules/evals/{service.ts,internal/calls.ts,internal/secrets.ts}`, commits 5abbe67 and 8f57542) and the runner's generic span check (`prove/internal/report.ts`, 9cb4242). AGENTS.md doesn't allow that. A ✍️ author who wrote none of it audited each change against this record:

- **`report.ts`** now accepts an empty trace only for a pre-handler `NotAllowed` that was predicted before the call (gap 3, M1.20).
- **The secrets eval** treats untraced public text as hidden in spans and logs, but allowed in the journal (gap 2, M1.19).

The author found no case that failed before and passes now, beyond what this record allows. Two corners stay open: a private field named `attempt`, `refusal` or `defect` is caught by value but not by name, and an operation with no declaration would skip `answerShape` (a compiled project can't have one). Verdict: accept as authored. A later author may add a test for the first corner. The lead also fixed the reviewer's P1 in 7a8cc38: untraced text was redacted only in `refusal.log`, and is now redacted for every logger, exporters included.
