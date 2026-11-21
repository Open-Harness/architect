# M1-49-issue-attribution: an issue's step is a declared step, read from the telemetry model

Goal 3's lead, 21 November 2026. A goal's own call, named by slug (K32). It is the plan from the deep review reset on
#447, after three rounds of review findings.

## The problem

There were three rounds of findings on #447, all valid, in two causal classes:

- **A, what a call means was worked out outside the grouping.**
  - The failing attempt was matched by time (round 1).
  - Occurrences were deduplicated by trace, operation and start (round 2).
  - The failing step was taken as the deepest errored span of any kind (round 3). So an adapter's span (`sql.execute`,
    `chain.evm.prepare`) became the issue's step, and issue keys split or merged on adapter internals.
  - Rounds 1 and 2 moved the call's identity into telemetry. The failing step was still worked out in
    `monitor/internal/failing.ts`, from raw spans, by a rule that knows no declared step.
- **B, a whole-window aggregate was taken over partial input.** This covers the window longer than the history, p95
  after truncation, and regrouping per rule. All three are fixed, and they need nothing further here.

## Decided

1. **The telemetry grouping is the only place that gives a call its meaning.** Each `MonitoredCall` carries:
   - its `id`: the runtime's `call.id` when every attempt carries the same one, and otherwise the attempt-span key;
   - its `failure` on a defect call: the step and the error tag.

   The monitor reads only those. `failing.ts` is deleted, and the monitor no longer reads span shapes.
2. **A step is a declared step.** A span is a step of operation `op` when it carries `step.kind` and its name is
   `model.operations[op].steps[k].name`, read from the blueprint on the wire and never written as a string. The
   runtime's commit span counts as the step `commit`. Adapter spans are walked through but never chosen. Among declared
   step spans under the failing attempt that ended as errors, the deepest is chosen, and on a tie the latest.
3. **A defect that no declared step explains still opens an issue, keyed to the operation itself** (step `-`). Examples
   are a read's defect, or a die outside every step, such as the answer check. Every defect counted in a burn can be
   found on the Issues page; today such defects open none.
4. **The local feed's 30-minute history is not extended here.** In `ortho dev` a burn whose long window exceeds the feed
   reads `unknown`, as the monitor now says honestly. Check 39 proves the fast burn through its own trace source.
   Making a local world fire it is snag #450, in prove's `portal-feed`.

## Rejected

- **Keeping the deepest errored span of any kind.** Issue keys would then follow adapter internals, not the blueprint.
- **Dropping defects outside every step.** The defect burn would then count calls no issue explains.
- **Matching step names by pattern (`<op>.<word>`).** That writes a name rule outside the declaration; the declared
  names are already on the wire.
