# infra

The `infra` projection: `generated/infra/alchemy.run.ts`, mounted by `blueprint/projections/infra.ts`. The Alchemy stack of an environment's
cloud resources (M7.03): a D1 database for each one the Worker binds, the Durable Object namespaces it needs, and the Worker itself on
`workers.dev`, deploying the one bundle of the revision. Pure: the model in, one file out.

The stack holds what the model decides (which bindings, which migrations folder for each, which classes, the compatibility settings) and
reads what a run decides, the plan's names and the bundle's path, from the file `ortho env up` writes beside the run's state and names in
`ORTHO_STAGING_INPUT`. The names are the plan's (`packages/cli/src/modules/staging/internal/plan.ts`), never formed here. State is local
(`State.localState()`), so the stack makes nothing in the account that carries no prefix; `Cloudflare.state()` would deploy a shared state Worker.
Test: `infra.test.ts`.
