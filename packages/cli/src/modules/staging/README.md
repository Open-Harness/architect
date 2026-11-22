# staging

`ortho env up staging --plan --run <id> [--root <dir>]`, `ortho env destroy staging --plan --run <id>`, and the real
`ortho env up staging --run <id>` and `ortho env destroy staging --run <id>` (M7.03, M7.04).

**The plan** is one function (`internal/plan.ts`), made from the model (its stores, and where each thing lives), the app's
name (`ortho.config.ts`, loaded), the environment and the run. `--plan`
prints it as one JSON document, and the real `up` and `destroy` run the same function and act on what it says. The prefix,
`ortho-<app, letters and digits>-stg-<run>`, is formed there and nowhere else; every name is the prefix or continues it past a
dash, so run `1` does not own run `12`'s resources. A run id is 1 to 20 of `a-z0-9`; a name that would be over 63 characters is
refused (exit 2, no plan).

**`up`** builds the bundle once, writes the run's input (`.ortho/staging/<prefix>/stack-input.json`: the plan, the bundle's path, the
Worker's plain settings) and runs `alchemy deploy` of the generated stack (`generated/infra/alchemy.run.ts`, the `infra` projection)
at the run's stage, from the run's folder, where Alchemy keeps its local state. Alchemy makes the databases and applies their
migrations, uploads the bundle, binds the databases and namespaces, turns the address on (previews off) and sets a fresh
`AUTH_SECRET`, handed over in the environment, never as an argument. A first deploy is retried once after a pause (spike snag 11), and
`up` waits for three good answers from the address before it hands it on (snag 10). The portal's client is not part of the staging
Worker (snag 5). `Staging.url(prefix, subdomain)` is the address of the Worker, from this module.

**`destroy`** has Alchemy destroy the stack first when the run's state is here, then always sweeps: it lists the account's Workers and
D1 databases and deletes those the run owns: nothing it did not list, nothing without the prefix. The sweep needs nothing from `up`, no
Alchemy state and no file, so it cleans after an `up` that died halfway and in another job than the `up`. A Worker's Durable Object
namespaces go with it.

**Credentials** are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, read by `main.ts` alone and handed in. Without them
`up` and `destroy` exit 2 naming what is missing and open no connection. Nothing prints either value.

The module returns what to say (`Said`); only `main.ts` prints and exits. Alchemy's async work is inside its own process, started in
`internal/live.ts`. Decision: `design/decisions/M7-03-infra-projection.md`. Test: `staging.test.ts`.

**`proveAddress`** (`internal/address.ts`) is where `ortho prove --env staging --run <id>` goes: `Staging.url(prefix, subdomain)` from the
project's name and the run, with the subdomain from `ORTHO_STAGING_SUBDOMAIN` (one DNS label), never typed in a project. A bad run, or a
missing or bad subdomain, is a refusal (exit 2) naming it. `ORTHO_STAGING_ORIGIN` (an `http` address on this machine only) is the address as
it is, and then no subdomain is needed. Nothing is contacted. Check 41.
`proveAddress` also returns the prefix and `owns`, so `prove` finds the run's D1 databases by name.
