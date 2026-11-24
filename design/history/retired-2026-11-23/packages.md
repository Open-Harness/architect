# Package structure

The map and why it is shaped this way: [`decisions/M0-packages.md`](../../decisions/M0-packages.md). The layer 1 and 2
version of this page is in [`history/packages-layers-1-2.md`](../packages-layers-1-2.md).

## The framework's repository

```text
packages/
  orthograph/        orthograph                    the front door: the Blueprint API (Blueprint.thing, machine, event,
                                                   error, role, operation, read, journey, world, environment, value,
                                                   todo; a plugin's descriptor: feature, adapter, projection, choice,
                                                   need, call, setting; and the mount, use), with Via, Host, Door,
                                                   Ships and Stand. Store, workflow, secret, view and agent come with
                                                   their milestones. What projects and their generated code import.
                                                   Effect only.
  compiler/          @orthograph/compiler          reads blueprint/ by path and builds the model: every declaration, its
                                                   hash, what it uses; compares two models (versions, stale proofs);
                                                   finds blanks. Bin ortho-model
  generators/        @orthograph/generators        the Nx plugin: scaffold generators write once; sync generators render
                                                   each output and fail `nx sync:check` on drift
  projections/      @orthograph/projections       the projections Orthograph ships, each a plugin an app mounts in
                                                   blueprint/projections/: model, api and server (M1.11); sdk, cli, mcp,
                                                   docs and portal follow (M1.12, M1.13). Build time only (`env:build`)
  language-effect/   @orthograph/language-effect   the Effect language: renders api, server, sdk, cli, mcp, docs; and the
                                                   runtime generated code runs on (handler wrapper, role checks, moves and
                                                   events, locks, outbox, idempotency, steps as spans, Clock, Timers)
  language-solidity/ @orthograph/language-solidity the Solidity language (a placeholder until M6)
  host-cloudflare/   @orthograph/host-cloudflare   where it runs: Workers, Durable Objects, alarms, D1, R2, and auth on
                                                   Better Auth until M2 moves it into @orthograph/auth
  prove/             @orthograph/prove             worlds (made and destroyed), journeys, evidence from telemetry, the
                                                   evals, verdicts, promote, publish, releases
  lint/              @orthograph/lint              oxlint rules for what types can't see, and against the old names
  cli/               @orthograph/cli               the `ortho` command: add, generate, check, prove, impact, promote,
                                                   publish, watch
  preset/            @orthograph/preset            the Nx preset that makes a starter project (until `ortho new`, M2.09)
  portal/            @orthograph/portal            the portal every project gets
  portal-ui/         @orthograph/portal-ui         the portal's components under our names; the portal and every face
                                                   build on its exports (F7, M1.34); deleted at cutover, when the new client replaces the old (K31, Goal 6)
  shell/             @orthograph/shell             the app's map at run time: the router over the generated route table,
                                                   the layouts and their slots, navigation, breadcrumb and palette (K31)
  theme/             @orthograph/theme             the one Orthograph stylesheet on UI SDK's `--ui-*` tokens (K29 Q3, K31)
  portal-next/       @orthograph/portal-next       the new portal client on the shell and the map, until cutover (Goal 6)
  web/               @orthograph/web               the browser host and the runtime every generated piece shares
                                                   (K29, ST1.25)
  logbook/           @orthograph/logbook           verdicts and the model, kept per project
  services/          @orthograph/services          private: the stand-ins tests and gates start as processes, never containers (the OIDC
                                                   issuer over jose, Verdaccio under Node, and the process owner); tag env:support
examples/
  acme/              the worked example: the allowance
  work/              the work app (F5)
  starter/           what the preset copies into a new project
e2e/                 the gates: e2e:layer1, e2e:layer2, e2e:m0
```

Plugins come later, one package each: `@orthograph/auth` and `@orthograph/organizations` (M2), `@orthograph/work` (M3),
`@orthograph/agent-kit` (M3, the agents projection that writes `generated/agents/`), `@orthograph/agents` (M4),
`@orthograph/stripe` and `@orthograph/resend` (M5), `@orthograph/wallets` (built in M1.29, the first: `packages/wallets`, with SIWE linking in M2.13). Goal 17 (K39) adds four features, `@orthograph/superagent`, `@orthograph/intake`, `@orthograph/tickets` and `@orthograph/prompts`, written first inside `examples/superagent/plugins/` and moved here once they work; the `@orthograph/sandbox` adapter (K40 fix 4); and the `@orthograph/github` (M4.25), `@orthograph/slack` and `@orthograph/posthog` adapters, generated from each service's spec (M5.07), with `@orthograph/webhook` for a service with none. Nothing is published to npm before M7; every milestone before it publishes to the local Verdaccio.

## Rules, held by Nx module boundaries

- `orthograph` (tag `scope:orthograph`) depends on nothing but Effect. Every other package may import it.
- A project (`scope:project`) depends only on `scope:orthograph`, `scope:language`, `scope:host`, `scope:projections` and `scope:plugin`:
  a blueprint mounts a projection or a plugin as it mounts any plugin, and nothing it generates imports the package.
- A plugin written inside an app (`scope:plugin`, set in its `package.json` as `"nx": { "tags": ["scope:plugin"] }`, GOAL17-plugin-scope)
  depends only on `scope:orthograph`, `scope:language` and other `scope:plugin` packages: a feature needs the roles, events and
  things of the plugins it builds on, and nothing of the host or the generators.
- `env:runtime` packages depend only on `env:runtime` packages; `env:build` packages may use both.
- Today `portal-ui` is the only package that imports `@heroui-pro/*` (lint, F7); new screens build on UI SDK and HeroUI is phased out
  (K24), after which the lint rule goes with it. `portal-ui` is a leaf that only the portal and faces depend on.
- `language-effect`'s runtime is the only package generated code imports at run time, besides `orthograph`, the host and
  the project's own code.
- `compiler` and `generators` never run in production.
- A language is a package of its own (`language-effect`, `language-solidity`, later `language-noir` and
  `language-python`); a host is where it runs (`host-cloudflare`).

## A project made with it

```text
acme/
  ortho.config.ts          the project's name, sign-in and telemetry choices, until mounts take them (M1, M2)
  blueprint/
    values/                 named types, each saying what it is in every language
    things/<thing>/         thing.ts, machine.ts, events.ts, errors.ts, roles.ts, verbs/<verb>.ts
    journeys/<journey>.ts
    starting-worlds/<name>.ts
    environments/<name>.ts  clock, secrets, destinations
    stores/<name>.ts        a place things live besides the default: `Blueprint.store.<kind>()` (K3)
  src/
    <thing>/<verb>.ts       a thing's handlers, mirroring blueprint/things/<thing>/
  generated/
    server/  api/  sdk/  cli/  docs/  model/  mcp/  portal/
```

From M1, `blueprint/` also holds the mounts: `features/`, `adapters/` and `projections/`, one file each
([`frame/mounting.md`](frame/mounting.md)).
