# @orthograph/workflows

Turns a workflow declaration and its handler into an `effect/workflow` `Workflow` and its activities, with the request
keys, `WorkflowEvents` and the timer waits (M3.28). Decision: `design/decisions/M3-workflows.md`, section 6. What is
here today is the surface the checks in `e2e/workflows` import; the run is the builder's.
