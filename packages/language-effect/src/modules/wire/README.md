# wire

`Wire.refusals(classes)`: a handler fails with the blueprint's error classes, and the API declares generated
`Schema.TaggedError` classes with their HTTP status. This maps one to the other by name, keeping the fields. Anything
not declared dies, so the caller sees a 500 and the trace a defect, never an undeclared refusal (D2 item 14).

`CallTelemetry`, the API's middleware, counts a payload its schema refuses as a refused `InvalidPayload`, then answers
it 400 with `{ _tag: "InvalidPayload", message }`: the message names each refused field and why, in the SDK's words,
and never a value the caller sent (#988).
