# workflows

`Workflows.register` and `Workflows.layer`: take each declared workflow with its handler, refuse a `call` whose operation
isn't `idempotent: "request"` (`WorkflowRefused`, naming the activity), and run the rest on `effect/workflow`. `WorkflowEvents.deliver`
is the one seam that completes an `await`. Decision: `design/decisions/M3-workflows.md`. Test: `workflows.test.ts` (the
builder's); the journeys that judge it are in `e2e/workflows`.
