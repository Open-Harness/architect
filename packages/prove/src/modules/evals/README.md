# evals

The nine evals, judged from evidence (each call's record, its telemetry from the collector and the world's facts)
against the model, never from what the server says about itself:

1. answer shape: every answer, read from the operation's span, decodes against its declaration. Schema-valued fields use their observed
   response type when available without filling a missing public span field; otherwise valid text is kept before decoding JSON. No secret or private value, sent
   or answered, is in any span, log or journal entry of the call (by name and by value; L2.P, D3 #83).
   A field declared `Blueprint.issued` must be on the answer of the operation that issues it (HAN-15), read from the model, which is authoritative (the compiler copies the mark in from the declaration and refuses it outside a secret answer value): visibility decides what is shown, never whether an issued token is there. The report names the operation and the field, never the value.
2. declared errors: every refusal is one the operation declares (its errors, its machine's, `NotAllowed`), and its answer carries the
   code the model fixed for it.
3. machine path: every move ends in a declared state, and the stored state is where it ended.
4. events: every move that happened journalled its event.
5. who may call: decided before the call from the world's facts and `allowed`; a caller without the role is refused.
6. steps: every declared step of an answered call ran in its own span.
7. performance: p50 and p95 against the budget; over 1.5x is a review line, never a failure.
8. coverage: every operation, move, outcome and declared error reached by some journey or starting world.
9. explainability: every declared refusal has a log inside the operation's span (the fact that decided it).

`Evals.gather` builds the evidence; `Evals.judge` returns one verdict per operation and eval, then coverage.
Test: `evals.test.ts`.

`Evals.judgeLive` (L2.09, D3 #143) runs the five evals telemetry alone can answer (answer shape, declared errors, steps, performance,
explainability) over the calls `watch` saw; who may call, machine path, events and coverage need the world's facts, the journal or a whole run, and stay prove's.
On live traffic a field that is secret or private, or named `email` (which never leaves the machine for a sink, D3 #120), is not checked, and a
replayed call (`request.replayed`) is not checked for its answer shape: it answers from the stored answer, not from a span.

Live refusal names are checked against the declaration. Response tag/code checks require an observed body and are unavailable to telemetry alone.
