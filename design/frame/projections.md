# Projections

A projection is a plugin that makes the description real in one form. The server, the SDK, the CLI, the MCP server,
the docs, the portal and the keeper are all projections. None of them is the system; each is a view of the model.
Contracts are not a projection: the Solidity language writes them, and `Host.chain` runs them (K27, section 3.9).
Part of the frame in [`README.md`](README.md); everything here is proposed.

## Today, in code

Today there is no such thing as a projection. There is one fixed list of renderers, called in one place:

```ts
// packages/generators/src/modules/render/service.ts:13-24 (origin/layer/3)
const docs = renderDocs(model, name);
return [
  { path: "generated/model/model.json", content: JSON.stringify(model, null, 2) + "\n", scaffold: false },
  renderEdges(model),
  ...docs,
  ...PortalRender.files({ name, model, docs }),
  ...renderApi(model, name),
  ...renderServer(model, name),
  ...renderMcp(model),
  ...renderSdk(model, name),
  ...renderCli(model, name),
  ...Object.values(model.operations).filter((op) => op.kind === "operation").map(renderHandlerScaffold),
];
```

Each renderer is a pure function from the model to files. Every renderer takes every operation:

```ts
// packages/generators/src/modules/render/internal/sdk.ts:10-26
export const renderSdk = (model: Model, name: string): ReadonlyArray<RenderedFile> => {
  const ops = Object.values(model.operations);           // all of them, with no rule
  ...
  path: `generated/sdk/src/${o.thing}/${o.verb}.ts`,
  `export const ${camel(o.verb)} = (payload: PayloadOf<typeof declaration>) =>`,
  `  Effect.flatMap(${client}, (client) => client${member(o.thing)}${member(o.verb)}({ payload }));`,
```

Three things follow from this:

- **Adding a projection means changing the framework.** You cannot add a React projection or a Python SDK without
  editing `service.ts`.
- **Nothing can be left out.** `outputs` in the config file was read by nothing (D3 #112) and was removed in M0. Where each output goes
  is a fixed set of keys on the environment (`deploy: { server, mcp, portal }`, `publish: { sdk, cli }` in
  `examples/acme/blueprint/environments/production.ts`).
- **Only the server is proved.** Journeys call the server directly over HTTP:

  ```ts
  // packages/prove/src/modules/journeys/internal/world.ts:85
  const r = yield* fetchJson(`${url}/${thing}/${verb}`, { method: "POST", ... });
  ```

  The SDK, the CLI and MCP are never exercised by a journey.

What `render` really does today is the right core. It is a pure function from the model to files, and it reuses the
declarations by import instead of copying them (D2 #17). The proposal keeps that core. It adds the rest of what a
projection is around it.

## 1. The contract

```ts
// @orthograph/projection: what every projection plugin exports
export interface Projection<Choices> {
  readonly host: ReadonlyArray<Host>;          // where its output runs; empty when nothing runs (docs, types)
  readonly builtOn?: Projection<unknown>;      // another projection it is layered on (the CLI on the SDK)
  readonly reaches?: Door;                     // the door it calls: server.api, server.mcp, or none
  readonly via?: ReadonlyArray<Via>;           // the ways its callers sign in: Via.session, Via.key, Via.device, Via.agent
  readonly takes?: (op: OperationModel) => boolean; // which operations it includes; the default rule is below
  readonly render: (project: Project<Choices>) => Effect<ReadonlyArray<Output>>; // { model, mount, mounts, environments }
  readonly replay?: (step: JourneyStep, world: World) => Effect<Evidence, ReplayFailed>;
  readonly ships: ReadonlyArray<Deploy | Release | Kept>; // deployed, released under a tag, kept in the repo; [] never shipped
}

export const cli = Blueprint.projection<CliChoices>({ host: [Host.node], builtOn: sdk, ... });
```

Here is what each field is for.

- **`host`** says where the output runs. It does two jobs:
  - It decides which client operations the projection can carry. An operation that `runs: client` needs code for this
    host, and the feature that owns the operation must provide it (`create.browser.ts`, `create.node.ts`).
  - It decides how the projection is tested. A worker projection is tested in workerd, a node one in node, a browser
    one in a real browser.
- **`builtOn`** names the projection this one is layered on. The CLI does not speak HTTP itself; it calls the SDK. The
  chain of projections is declared, not implied, so `blueprint model --projections` can draw it and a change to the SDK
  knows the CLI depends on it.
- **`reaches`** names the door this projection calls, if it calls one. A door is an entrance a server-hosted projection
  opens. All the doors, once: the server opens `server.api`, `server.mcp` (serving the `mcp` projection's catalogue)
  and `server.inbound` (one per adapter event the app takes), and in a world also the world door (`/_world/*`). The api
  and the SDK reach `server.api`. The CLI and MCP are built on the SDK and reach nothing themselves. Docs reach nothing.
- **`via`** lists how this projection's callers prove who they are:
  - a browser SDK signs in by session;
  - a CLI signs in by device login or by API key;
  - the MCP server lets agents in by OAuth.

  It is half of the inclusion rule.
- **`takes`** is the rule for which operations this projection includes. The default rule:

  ```ts
  const defaultTakes = (p: Projection) => (op: OperationModel) =>
    canHost(p, op.runs) &&                       // runs: server needs a reach to a server; runs: client needs this host
    op.reach.some((v) => p.via?.includes(v) ?? true); // someone who signs in this way may call it
  ```

  A mount may narrow this rule but never widen it. Nothing names a way in by hand.
- **`render`** is today's renderer, unchanged in spirit: a pure function from one `project` value (the model, this
  mount's choices, the other mounts, the environments) to files under `generated/<mount>/`. It may import the declarations, never copy them.
- **`replay`** runs one journey step through this projection's built output and returns the evidence. This is what
  makes a projection proved rather than just generated ([section 4](#4-the-replay-rule)). Only projections that callers
  call need it. Docs and infrastructure have none, and say "not proved by replay".
- **`ships`** says how the output reaches the world:
  - `Deploy`: we run it at a place, such as a Worker at a domain.
  - `Release`: we hand it to others under a tag, such as an npm package or a Homebrew formula.
  - `Kept`: it is a file in the repository, such as docs or the model.

  The environment says where. The projection only says which kinds it accepts: `Release.npm` is a kind; `Npm.latest`
  in an environment is where.

## 2. Mounting a projection

A projection is mounted like any plugin: one file, and the file's name is the mount's name.

```ts
// blueprint/projections/cli.ts: the public CLI, command `acme`
import { Blueprint } from "orthograph";
import { cli } from "@orthograph/projections";

export default Blueprint.use(cli, (c) => [
  c.command.fromProject,            // `acme`, from package.json's name
  c.via([c.via.device, c.via.key]),
]);
```

```ts
// blueprint/projections/cli-admin.ts: a second CLI from the same plugin, for operators
import { Blueprint } from "orthograph";
import { cli } from "@orthograph/projections";
import { operator } from "../things/system/roles.ts";

export default Blueprint.use(cli, (c) => [
  c.command.named("acme-admin"),
  c.via([c.via.key]),                                  // keys only: run from CI and ops machines
  c.takes((op) => op.allowed.includes(operator)),      // only what an operator may do
]);
```

The two mounts are the reason for one file per mount. A list of options in a config file cannot say "two CLIs,
different callers, different operations" without inventing names in strings. Here each CLI is named by its file, and
its folder follows (`generated/cli/`, `generated/cli-admin/`). Its command is a choice: `c.command.fromProject` gives
`acme`, `c.command.named("acme-admin")` gives the second. A command name is a package-level name, like an npm
package's, not a declared name, so writing it is allowed.

The environment places each mount. It refers to mounts by import, never by a string:

```ts
// blueprint/environments/production.ts
import { Blueprint, Cloudflare, Npm, Homebrew, Via } from "orthograph";
import server from "../projections/server.ts";
import mcp from "../projections/mcp.ts";
import sdk from "../projections/sdk.ts";
import cli from "../projections/cli.ts";
import cliAdmin from "../projections/cli-admin.ts";
import portal from "../projections/portal.ts";

export default Blueprint.environment({
  issues: [Via.session, Via.key, Via.device, Via.agent],
  places: [
    server.at(Cloudflare.worker({ domain: "api.acme.dev" })),
    mcp.at(Cloudflare.worker({ domain: "mcp.acme.dev" })),
    portal.at(Cloudflare.route(server, "/portal")),
    sdk.release(Npm.latest),
    cli.release(Npm.latest, Homebrew.tap("acme/tap")),
    cliAdmin.release(Npm.private),
  ],
});
```

`ortho check` cross-checks the mounts against the environments:

- a mount the environment does not place is fine; it just isn't shipped there;
- a place whose kind the projection does not accept is an error (a `Release` given to the server);
- a `via` the environment does not issue is an error (`cli` wants `Via.device`, but staging issues only `Via.session`).

## 3. A catalogue of projections

Each entry gives the definition sketch, what it takes, what it renders, how it replays and how it ships. The "today"
column cites the renderer it grows from.

### 3.1 The server (Cloudflare)

The server is the Worker that runs every `runs: server` operation, with D1 and a Durable Object per actor. In a world
it also opens the world door (`/_world/*`: the cast, the facts, the clock, the stand-ins of every mounted adapter), which
staging and production close (D3 #126). There is no separate world projection: a world is the description running for
a test, and this is the door `prove` uses.

```ts
export const server = Blueprint.projection({
  host: [Host.worker],
  takes: (op) => op.runs === "server",
  render: ({ model, mount }) => Effect.succeed([
    ...routes(model),         // each operation's route wired to its handler in src/, by path
    ...actors(model),         // a Durable Object class per thing that lives as an actor
    migration(model),         // D1 tables from the model
    wrangler(mount),          // the Worker's configuration
  ]),
  ships: [Deploy.worker],
  // no replay: the server is what every other projection's replay lands on
});
```

- **Today:** `render/internal/server.ts:1-2`, `server.ts:190`, `worker-config.ts:9,55`.
- **What it opens:** `server.api`; `server.mcp` once MCP is mounted; `server.inbound`, one per adapter event an
  operation takes; and in a world, the world door. Today the world door lives in the server renderer (`server.ts:1-2`).
- **Proving it:** it has no replay of its own, because it is the far end of every other replay.
- **Hosts:** one per host plugin. `@orthograph/host-cloudflare` is the one that exists. A Node server is the fallback
  seam (`decisions.md`, "a seam for another host kept but unused").

### 3.2 The HTTP API and its OpenAPI document

The API is the contract: endpoints, wire errors and handler types. As a projection it also writes an OpenAPI document
for callers who will never use our SDK.

```ts
export const api = Blueprint.projection({
  host: [],                       // types and a document, nothing runs
  reaches: server.api,
  takes: (op) => op.runs === "server",
  render: ({ model }) => Effect.succeed([...endpoints(model), ...handlerTypes(model), openapi(model)]),
  replay: (step, world) => postJson(world.door(server.api), step), // today's world.ts:85, renamed honestly
  ships: [Kept],                           // and served at /openapi.json by the server
});
```

- **Today:** `render/internal/api.ts:1,135`. There is no OpenAPI document yet.
- **Replay:** today's raw-HTTP journey runner becomes this projection's replay. It stays the cheapest replay, and it is
  the baseline every other replay is compared to.

### 3.3 The TypeScript SDK

The SDK is a typed client: one function per operation, with refusals arriving as their own classes.

```ts
export const sdk = Blueprint.projection({
  host: [Host.node, Host.browser],
  reaches: server.api,
  via: [Via.session, Via.key],
  render: ({ model }) => Effect.succeed([client(model), ...perOperation(model), ...clientOperations(model)]),
  replay: (step, world) => runInHost(Host.node, sdkCall(step), world),
  ships: [Release.npm],
});
```

- **Today:** `render/internal/sdk.ts:10-26`.
- **New here:** client operations. `wallet.create` becomes local code imported from the wallets feature's `/browser`
  or `/node` entry, not an HTTP call. `wallet.link` is local code that makes two calls.
- **Replay:** imports the built SDK in a node process, signs in as the cast member and calls the function.

### 3.4 The web

The web projection gives a web app one generated piece per operation, on UI SDK: a framework-free primitive bound to
the operation's generated action, with its React parts beside it (React only in the beta). A read loads, a move or a
write is a form or a button, and a refusal, a pending call and an agent's limits come with it
([`../decisions/K29-ui-layer.md`](../decisions/K29-ui-layer.md)).

```ts
export const web = Blueprint.projection({
  host: [Host.browser],
  builtOn: actions,
  via: [Via.session],
  render: ({ model, choices }) => Effect.succeed([...pieces(model, choices.frameworks), host(choices.frameworks)]),
  replay: (step, world) => runInBrowser(pieceHarness(step), world),  // a real browser (Playwright), never jsdom
  ships: [Release.npm],
});
```

- **Today:** nothing. `spikes/ui-sdk-real-world` generated the claim form and replayed a real journey through it.
  Built in ST1.25, ST1.06 and ST2.03.
- **Scope:** it renders pieces, not screens. Pages are the app's own code in `src/web/`, composed from the pieces and
  UI SDK's components, scaffolded once if asked.
- **Replay:** a headless browser fills and presses the step's piece, as a person or as an agent through UI SDK's
  bridge. The browser signer of wallets is proved here, which is how risk 3 in `spikes/kits-dx/README.md` is closed.

### 3.5 The CLI

One command per operation: `acme <thing> <verb> --<field>`, with exit codes from the declared errors.

```ts
export const cli = Blueprint.projection<CliChoices>({
  host: [Host.node],
  builtOn: sdk,
  via: [Via.device, Via.key],
  render: ({ model, mount }) => Effect.succeed([...commands(model), session(mount), main(mount)]),
  replay: (step, world) => spawn(builtBinary, argv(step), { env: world.credentialFor(step.cast) }),
  ships: [Release.npm, Release.homebrew, Release.binaries],
});
```

- **Today:** `render/internal/cli.ts:1,116` and `cli-session.ts`.
- **Replay:** runs the built command as a real process and parses its output and exit code back into an answer or a
  refusal.

### 3.6 The remote MCP server

The MCP server gives agents one tool per operation and read, signed in by OAuth.

```ts
export const mcp = Blueprint.projection({
  host: [Host.worker],
  builtOn: sdk,
  via: [Via.agent],
  takes: (op) => op.runs === "server" && op.reach.includes(Via.agent), // an agent never runs client code of ours
  render: ({ model }) => Effect.succeed([catalog(model)]),
  replay: (step, world) => mcpClient(world.door(server.mcp)).callTool(step),
  ships: [Deploy.worker],
});
```

- **Today:** `render/internal/mcp.ts:1-8`. The catalogue takes every operation today.
- **Replay:** a real MCP client completes OAuth headless (`spikes/mcp-oauth`), then calls the tool. It replays only the
  steps whose operations an agent may reach. A journey that is all session-only steps has nothing to replay here.

### 3.7 Docs

A page per thing and per operation: who may call it, what goes in and out, every refusal with its exit code, and how to
call it from each mounted projection.

```ts
export const docs = Blueprint.projection({
  host: [],
  render: ({ model, mounts }) => Effect.succeed([...thingPages(model), ...operationPages(model, mounts)]),
  ships: [Kept],
});
```

- **Today:** `render/internal/docs.ts:1-2,77`.
- **New here:** "how to call it" is written per mounted projection. That is the one projection that reads the other
  mounts.
- **Replay:** none. Its check is that each example call parses against the projection it names.

### 3.8 The portal

The portal is a read-only site for people and agents. It shows the catalogue of things, the proof matrix and the plan.
Its data is generated; its renderer is shipped once.

```ts
export const portal = Blueprint.projection({
  host: [Host.worker],
  render: ({ model }) => Effect.succeed([blueprintJson(model), entry()]), // generated/portal/blueprint.json, main.ts
  ships: [Deploy.route],  // a route of an environment's Worker (/portal, /_portal/v1/*), not a site of its own
});
```

- **Today:** `PortalRender.files` in `render/service.ts:18`. F1's "built since" says it is a route of each
  environment's Worker.
- **Replay:** none. Its proof is the digest check on the wire projection (D3 #130).

### 3.9 Solidity contracts: a language, not a projection (K27)

Solidity is a language on `Host.chain`, not a projection. It is listed here because the SDK, CLI and MCP reach what it
writes. For every thing that lives in a chain store (K25), the Solidity language renders:

- its contract scaffold, with blanks;
- the compiled machine (`_step`);
- the EIP-712 types;
- Foundry tests: every move from every state, every write signed by the wrong signer, every signature replayed.

```ts
export const solidity = Blueprint.language({
  frame, scaffold, surface, refusal, guards,   // the contract, src/<Store>.sol, surface.json, refusals.lock
  writesFor: ["chain.evm"],    // the store kind its code is written for
});
export const chain = Blueprint.host({   // Host.chain
  supplies: ["chain.evm"], wire: "chain",
  deploy,                     // redeployed only when the bytecode changes
});
```

- **Today:** `packages/language-solidity/src/index.ts` is a shell. Layer 4 builds it.
- **Mounting:** the language and the host mount automatically when a thing first lives in a chain store, because you
  cannot have one without the other. The mount files are written for you, with no choices.
- **Replay:** a world's journey step goes through the relayer, on the world's Anvil.
- **Note:** its scaffold is `src/<Store>.sol`, named after the chain store. Every other scaffold is a handler.

### 3.10 The keeper

The keeper is the built-in caller for time. It makes every `every` and `after` move on time, through the world's
`Timers`.

```ts
export const keeper = Blueprint.projection({
  host: [Host.worker],
  takes: (op) => op.move?.by === "time",
  render: ({ model }) => Effect.succeed([...timerPerMove(model)]),   // one timer file per time move
  replay: (step, world) => world.clock.advanceTo(step.at),        // a stepped clock fires it; evidence as any call
  ships: [Deploy.worker],
});
```

- **Today:** nothing. This is layer 5.
- **Principal:** the keeper calls as the `system` principal. Its key may only make time moves.

### 3.11 Infrastructure

Infrastructure is the Alchemy stack per environment: Workers, D1, R2, Durable Object bindings, domains and secret names.

```ts
export const infra = Blueprint.projection({
  host: [],
  render: ({ model, mounts, environments }) => Effect.succeed(environments.map(stack)),
  ships: [Kept],     // applied by `ortho promote`, in the cloud pass
});
```

- **Today:** the `infra` projection (`packages/projections/src/modules/infra`) writes the Alchemy stack to `generated/infra/alchemy.run.ts` (M7-03, `design/decisions/M7-03-infra-projection.md`), run by `ortho env up|destroy staging --run <id>`; the local environments keep their wrangler configs in `.ortho/environments/` (D3 #17).
- **Inputs:** this projection reads the environments, not just the model. That is why `render` is given them.

### 3.12 A Python SDK

A typed client for Python callers, built from the API's OpenAPI document.

```ts
export const python = Blueprint.projection({
  host: [Host.python],
  builtOn: api,                     // from the OpenAPI document, not from the TypeScript SDK
  via: [Via.key],
  takes: (op) => op.runs === "server",
  render: ({ model }) => Effect.succeed([...pydanticModels(model), client(model), pyproject(model)]),
  replay: (step, world) => spawn("python", ["-m", "replay", ...], { env: world.credentialFor(step.cast) }),
  ships: [Release.pypi],
});
```

- **Today:** nothing. `later.md` has "Python as a third target", meaning server-side Python. This is only a client,
  much smaller.
- **What it shows:** a projection can build on the OpenAPI document instead of the TypeScript SDK. It cannot carry
  client operations, because no feature ships Python code for them. Its `takes` says so, and docs mark those operations
  "not in Python".

### 3.13 A mobile client (later)

The honest option is React Native over the TypeScript SDK. It is the same host family (JavaScript), so client
operations can carry a `native` implementation beside `browser` and `node`.

```ts
export const reactNative = Blueprint.projection({
  host: [Host.native],
  builtOn: sdk,
  via: [Via.session, Via.device],
  render: ({ model }) => Effect.succeed([...hooks(model)]),
  replay: undefined,   // later: a simulator harness; until then it is generated and not proved, and says so
  ships: [Release.npm],
});
```

It is marked later because there is no replay yet. A projection without a replay prints `not proved` beside every
operation it carries. It never prints a pass it did not earn.

### 3.14 The builder projection

The builder projection is for builders, not callers. Mounted in every app, it renders `generated/builder/`: the typed
`bp` API and its `bp.d.ts`, and the brief texts. The tools themselves are `BuilderTools` in the CLI package: `blueprint
mcp` (a stdio MCP server, for builders on their own machine) exposes four direct tools, `describe`, `run`, `brief` and
`write`, and everything else is code mode over `bp`. Do not confuse `blueprint mcp` with the `mcp` projection above,
the remote server for the app's callers.

```ts
export const builder = Blueprint.projection({ host: [], render: ({ model }) => Effect.succeed([bpTypes(model), briefs(model)]), ships: [] });
```

It is never shipped to an environment and has no replay. See [`builder.md`](builder.md).

## 4. The replay rule

One journey, many projections, the same evidence.

A journey says what happens: `s.olga.run(spend, { … })`. It never says how. `prove` runs each step once through every
mounted projection that has a `replay` and takes that operation. Each run must leave the same evidence.

### What "the same" means

| Compared | Rule |
|---|---|
| the answer | equal after decoding with the operation's answer schema |
| a refusal | the same declared error, with the same fields, and the same refusal code |
| events | the same events, in the same order, with equal payloads |
| the machine | the same state after the step |
| spans | the same operation and step spans. A projection's own transport spans (`sdk.request`, `cli.process`, `mcp.tool`) are set aside, and only checked to be children of the caller's span |
| a defect | never: a defect through any projection fails the step |

Each projection's replay also adds checks of its own:

- the CLI's exit code must match the error's declared code;
- MCP's refusal must carry the refusal code;
- The web piece must reach its refusal state with the declared code.

### Which steps go through which projection

- A server operation goes through every projection that reaches the server and whose `via` its `allowed` admits.
- A client operation goes only through projections whose host the feature ships code for. `wallet.create` runs through
  the SDK in node, React in a browser and the CLI. It never runs through MCP, because MCP's `takes` leaves it out.
- An agent-reachable step goes through MCP as well.
- If a step's operation is not taken by a projection, that projection skips the step but keeps the world's state. A
  later step it does take still runs against a world where the earlier step happened. To make that work, a projection
  that skips a step plays it through the API replay instead.

### Cost, and when it runs

Replay multiplies prove time by the number of projections that take a step. Today acme has 15 journeys through one
door. With the server API, SDK, CLI, MCP and React, most steps run four or five times.

- **In CI:** every journey through every projection, every time. Verdicts are only written there.
- **Locally:** `ortho prove` replays through the API, plus each projection whose output changed since the last
  green run. `ortho prove --all` replays through every projection.
- **Worlds:** each projection replays in its own world from the same starting world, in parallel, so wall-clock time
  grows less than the work does.

## 5. Layering: built on

```text
server ──opens──▶ server.api ◀──reaches── api (types, OpenAPI)
                                   ▲
                                   │ builtOn
                         sdk (TypeScript)              python (builtOn api)
                        ▲          ▲         ▲
                 builtOn│   builtOn│  builtOn│
                     cli         react      mcp ◀──serves── server.mcp (opened by the server)
```

A projection builds on another for three reasons.

1. **One owner per shape.** The SDK owns "how to call the API from TypeScript". The CLI and MCP reuse it rather than
   speaking HTTP themselves, so a fix to retries or auth headers lands once (`decisions.md`, "the CLI and the MCP
   server on the SDK").
2. **Client operations come for free.** `wallet.link`'s local code lives in the SDK. The CLI and React get it by
   building on the SDK.
3. **Staleness is exact.** `builtOn` is in the model, so `ortho impact` knows that a change to the SDK
   projection's version re-renders the CLI, the MCP server and the web pieces, and re-runs their replays.

A projection may only build on a projection that is mounted. `ortho add projection react` mounts the SDK too if it
is missing, the same way a feature's needs are met ([`mounting.md`](mounting.md)).

## 6. Today and proposed

| Piece | Today (origin/layer/3) | Proposed |
|---|---|---|
| The list of projections | fixed in `render/service.ts:13-24` | mounts in `blueprint/projections/`, one file each |
| Which operations each takes | all of them (`sdk.ts:10`, `mcp.ts:8`) | `takes`, defaulting to `runs` + `allowed` with `via` |
| Naming a CLI or SDK package | the project's folder; `outputs` unread (D3 #112) | the mount's file name and its choices |
| Where each one ships | fixed keys `deploy`/`publish` (`production.ts`) | `places` in the environment, by imported mount |
| Proving clients | none; journeys use raw HTTP (`world.ts:85`) | each projection's `replay`, compared by the replay rule |
| Client operations | refused by the compiler (`operations/types.ts:49-50`) | carried by projections whose host the feature ships code for |
| Third-party projections | impossible | a package exporting `Blueprint.projection(...)` |
| Solidity, keeper, infra | a shell (`language-solidity/src/index.ts`), later layers | projections mounted with their layer |

## 7. Open risks

1. **Replay of every journey through every projection may be too slow locally.** The local subset rule above is a
   guess; it needs measuring on acme once the SDK and CLI replays exist.
2. **CLI replay spawns a process per step.** If that costs hundreds of milliseconds each, the CLI may need an
   in-process mode that runs the same command parser without a spawn. That would prove the parser but not the binary.
   CI would still run the binary.
3. **React replay needs a real browser** in CI and on the Mac. That is the same need as browser signers (S-RC, the
   proposed runs-client spike in `decisions/K1-kits.md` section 5).
4. **"The same evidence" across projections assumes one trace per step.** The CLI's own process and MCP's OAuth
   exchange add spans. The rule sets transport spans aside by name, which means each projection must declare its
   transport span names.
5. **Docs reads other mounts and infra reads environments.** That is why `render` takes one `project` value (model,
   mount, mounts, environments) rather than the model alone. A projection that reads environments re-renders whenever
   one changes; `impact` must know that.
6. **A projection without a replay** (mobile today) must never look proved. The portal's proof matrix needs a
   `not proved here` state per projection, not only per operation.
