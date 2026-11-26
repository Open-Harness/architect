# handler

`Handlers.serve({ name, operation, handler })`, the wrapper every generated operation runs through. It decodes the
payload (refusing with `InvalidPayload` before the handler runs), checks who may call (`NotAllowed`, before the
handler's span opens, so a refused caller leaves no handler span), runs the handler as counted work inside a span named
after the operation with `payload.<field>` and `answer.<field>` attributes for declared public fields, with public text
included only when marked `Blueprint.traced(...)` (O2). The journal keeps public event fields. The wrapper gives each
declared step its own span `<name>.<key>` (a call step runs the adapter's callable through `calls`, in the same span, kind `call`, and `Handlers.blank(what, "failure")` stands in the mapping's place until it is written) and checks
the answer against its declaration (an answer outside it dies, as the handler's bug). Machines and events join it in
stage one's later steps.

What the runtime hands in (K16, M1.46; `internal/prehandle.ts`): after the role check and before the from-check, every
payload field holding some thing's id is read once in the call's unit and handed in as `refs.<field>`, the operation's own
instance as `subject` (the same read the from-check and the commit's version guard use), and a creating move's new id,
minted, as `id`. A field in `notFound` (generated from the model) that names nothing is refused with its
`<Thing>NotFound { id }` before the handler runs; a role-gated miss is already `NotAllowed`. A creating move whose handler
stored nothing gets its instance stored from the id, the payload and the answer. Test: `prehandle.test.ts`.

Inner operations (#1079, `design/decisions/CX-inner-operations.md`; `internal/inner.ts`, `internal/steps.ts`, `internal/attempt.ts`): an
operation step's runner, `steps.<key>(payload)`, runs the operation the server wired under that key (`operations: { <key>: <inner>Served }`)
inside the outer's attempt, for the same caller: its access rule, prehandle, from-check, handler, answer check, move and G5 rules, its writes
held in the outer's unit and its entries in the outer's journal, so the one commit carries both and a lost race reruns both. It runs in its
own span, named after it, inside the step's span (`step.kind: operation`), and its refusals count as the outer's. Its spans name it with
`inner.operation`, never `operation`, so the portal counts the outer's one call and no call of the inner. Tests: `inner-operation.test.ts`,
`inner-operation-rules.test.ts`, `inner-span.test.ts`.

`Reads.serve` serves two kinds of read: by id (one instance, a missing one refused `NotAllowed`) and a list (`where`, `order`,
`page`; L2.04). A list reads a page from `Store.list`: instances matching every filter the caller gave, in the order the rows were
made (never a clock), `page` of them, answered `{ items, next }`; `next` is a cursor to send back as `cursor`, and null on the
last page. Its role is decided on the thing a filter names (`owner.of("organization")`), so a list with no such filter is refused.

How a span ends (O1, D3 #105): a declared refusal ends the operation's span, and a step's, **ok** with its `refusal` tag, since it is an outcome and
must not turn a trace red or count as an error; a defect ends it as an **error** with its `defect` tag. `internal/span.ts` (`spanned`) does it for
operations, steps and reads. A caller the role refuses (`NotAllowed`) has no operation span, since the operation did no work: its refusal is a span named `<name>.refused`, with `refusal`, `refusal.code`, `operation` and `principal.kind` (G8). A move's `move.name` and `move.to` are written on the operation's span, even when the handler moves inside a step.

`Device.serve({ name, operation, handler })` (M1.27) runs a plugin's `runs: "client"` operation in the caller's own process: the handler with its step spans and the operation's span, as an anonymous caller, with no store or journal, the answer checked against its declaration, and the spans sent as OTLP/HTTP from the process before the call returns (`internal/device.ts`; also from `@orthograph/language-effect/device`). Test: `device.test.ts`.

M1.29: `Device.serve`'s exporter also sends the logs written inside the call (`OtlpLogger`), so the log that decided a declared refusal is in the trace as a served operation's is, where the explainability eval looks for it. `DeviceWorld` (a `Context.Service`, also from `/device`) is what a world gives the plugin's `world` entry: the chain it stood, a funded key per host (redacted), a folder of its own and `remember`, a place to keep what a call leaves for the next. A real device never provides it and its entries never ask.
