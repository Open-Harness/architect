# workflows

Owns `Blueprint.workflow` and `Blueprint.activity.{call,await,after,at}`: a job that runs for a long time, in steps that
survive the machine stopping. Declared in `blueprint/workflows/<name>.ts`; its body is written in `src/workflows/<name>.ts`
as a `WorkflowHandler`. The run itself is `@orthograph/workflows` (M3.28). Decision: `design/decisions/M3-workflows.md`.

Written by the author of the checks (M3.27) so they have something to import: the constructors only record what was
declared. The builder (M3.28) keeps this module's shape and may change how a declaration is stored. Test:
`workflows.test.ts` (the builder's).
