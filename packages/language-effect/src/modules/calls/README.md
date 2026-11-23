# calls

How a handler's call step runs (`steps.price([payload.origin, payload.mode], failure)`; M1-plugins sections 9 and 9.1).
`Calls.runner` takes the call's declaration (its mode and the errors it declares), and what the generated server wired
to it (the adapter's callable, and its `layer` when it ships one), and gives the step: the callable's arguments, and the
one mapping from what the call failed with to one of its declared errors. The handler wrapper (`Handlers.serve`) puts it
in the step's span, `<thing>.<verb>.<step>`, marked `call`.

Promise mode calls lazily inside `Effect.tryPromise`; only that wait is uninterruptible, so an interrupted fiber stays
counted until the Promise settles, and the mapping, outside it, is a defect when it throws. Effect mode keeps the typed
failure and the adapter's services and maps only that failure. What the mapping returns must be one of the call's declared
errors, or it is a defect (never a refusal made up); it logs the decision, naming the refusal and never the foreign
failure. Nothing here waits: there is no sleep to put through `Timers`. Test: `calls.test.ts`, which holds a real Promise
and counts with the real `BusyLive` (check `04` does the same over HTTP in a world).
