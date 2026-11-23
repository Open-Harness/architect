# M1-plugins: the plugin descriptor, mounts and the verbs

Decided 18 November 2026 by the 🧭 lead of M1's plugin path (goal 3, [`../goals/03-m1-plugin-path.md`](../history/goals/03-m1-plugin-path.md)).
Slice M1.01. It harvests sections 1 to 3 of Codex's D4 (`layer/4:design/decisions/D4.md`, "kits, dependencies and
the chain") under the frame's words ([`../frame/mounting.md`](../frame/mounting.md),
[`../frame/projections.md`](../frame/projections.md), [`../frame/adapters.md`](../frame/adapters.md),
[`../frame/writing-a-feature.md`](../frame/writing-a-feature.md)), and folds in what K5 needs of the descriptor.

This is the public surface the ported checks in `e2e/m1` judge. A builder implements it; a ✍️ author writes the checks
from it. Where this record and a frame page disagree, this record wins and the frame page is fixed in the same change.

## What D4 said, and what changes

| D4 (kits) | Here (plugins) | Why |
|---|---|---|
| a kit, `blueprint/kits/<alias>.ts`, `Blueprint.kit(Kit, choices)` | a feature, adapter or projection, `blueprint/{features,adapters,projections}/<name>.ts`, `Blueprint.use(plugin, (p) => [...])` | the frame's three kinds and four verbs (K2 Q3, Q4) |
| choices are canonical JSON values (`{ prefix: "" }`) | a **choice** is a pick among options the plugin proved; a value that differs by environment is a **setting** | frame: "a choice never varies by environment"; a free JSON value is unproved |
| declarations as one namespace per thing from `./blueprint`, names from export identifiers | a feature's `blueprint/` folder has the **same layout as an app's** and is read by the same layout reader: names from paths | one rule for apps and plugins; a plugin author writes exactly what an app writes |
| canonical names `kit:fixture:echo.repeat`, paths `kits/fixture/echo` | names as in an app: `echo.repeat` when the mount keeps the plugin's own name, `fixture-echo.repeat` when it is renamed | frame, "Names and clashes" |
| `make(choices, declarations)` returns `{ handlers, layer }` | one handler module per operation in the package's `src/`, the same layout as an app's `src/`, plus an optional `layer` | names from paths again; open to K7 F1's one generated entry per operation (below) |
| `uses: [kit]` on an operation; dependency descriptors | `needs:` between plugins now; an app operation reaching a plugin is a **step** (`Blueprint.step.call` for an adapter's call, `Blueprint.step.use` for a feature's export), M1.14 | frame: calls out are steps, so each is a span with declared errors |
| `architect add dependency` writes a declaration and a mapper | an adapter is its own package, mounted like the others; its one blank is the error mapping in the calling handler | frame, adapters.md "Calling out" |

Kept from D4 unchanged: the descriptor and declaration entries are pure (no runtime import, checked on the real import
closure, never by tree shaking); runtime entries are separate per host and requesting a missing one fails explicitly,
never shimmed; one plugin is mounted once in M1; error wire tags come from exported class names and are never
alias-stamped; ambiguous tags in one error union and duplicate final codes are refused; the uses graph is one
normalized list of edges that `impact` prints; a plugin's hash includes its exact resolved identity and the bytes of
its installed files, and fails closed without them; nothing absolute or transient enters a hash; D4 section 3's
Promise and Effect call semantics (below).

## 1. Three kinds, one package shape

A plugin is one npm package. Its `package.json` carries an `orthograph` key, which is how `ortho` knows it is a plugin
and where its parts are:

```jsonc
// @fixture/echo/package.json
{
  "name": "@fixture/echo",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/feature.d.ts", "default": "./dist/feature.js" },              // the descriptor: pure
    "./blueprint/*": { "types": "./dist/blueprint/*.d.ts", "default": "./dist/blueprint/*" }, // declarations: pure
    "./src/*": { "types": "./dist/src/*.d.ts", "default": "./dist/src/*" }                 // behaviour, by host
  },
  "orthograph": { "kind": "feature", "blueprint": "./dist/blueprint", "src": "./dist/src" },
  "peerDependencies": { "orthograph": "0.0.0", "@orthograph/language-effect": "0.0.0" }
}
```

- `kind` is `feature`, `adapter` or `projection`. `ortho add <kind>` refuses a package whose kind differs.
- `blueprint` is a folder with an app's layout: `things/<thing>/{thing,machine,events,errors,roles}.js` and
  `things/<thing>/verbs/<verb>.js`, `values/*.js`, `choices.js`, and `journeys/*.js`. Names come from these paths, by the
  same reader and the same rules as an app's (`packages/compiler/src/modules/model/internal/layout.ts`).
- `src` holds behaviour with an app's layout: `<thing>/<verb>.js` is the handler of a server operation, by default
  export; `<thing>/<verb>.node.js` and `<thing>/<verb>.browser.js` are an operation's code on those hosts (for
  `runs: "client"`, M1.27); `layer.js`, when present, exports `layer`, the services the plugin's handlers need.
- A published plugin ships JavaScript and declaration files (Node does not strip types inside `node_modules`). In a
  workspace the same keys may point at TypeScript sources.

## 2. The descriptors

The package's root export is its descriptor, made with one of three functions in `orthograph` (Effect-only, per the
package rules). Each is pure metadata.

```ts
// @fixture/echo: src/feature.ts
import { Blueprint } from "orthograph";
import * as choices from "./blueprint/choices.ts";

export default Blueprint.feature({
  description: "Repeats what it is given.",
  choices,                       // what an app may pick when it mounts it
  needs: [],                     // other plugins it needs mounted beside it
  // settings, exports: shapes below; settings land in a later slice, exports in M1.14
});
```

```ts
// @fixture/echo: src/blueprint/choices.ts
import { Blueprint } from "orthograph";
/** How the echo is said. The first option is the default. */
export const style = Blueprint.choice({ plain: "Repeats the text as it was given.", loud: "Repeats it in capitals." });
```

| Field | `feature` | `adapter` | `projection` | Meaning |
|---|---|---|---|---|
| `description` | ✔ | ✔ | ✔ | one sentence, shown by `describe`, docs and `add` |
| `choices` | ✔ | ✔ | ✔ | named `Blueprint.choice` objects; each option is something the plugin proved |
| `settings` | ✔ | ✔ | — | named `Blueprint.setting.<kind>(Value, …)`; each environment gives a value (shape only in M1, below) |
| `needs` | ✔ | ✔ | — | plugin descriptors, or `Blueprint.need(descriptor, { when: option })` |
| `exports` | ✔ | — | — | `Blueprint.export` values an app's handlers use as steps (M1.14) |
| `calls`, `events`, `standIn`, `host` | — | ✔ | — | adapters.md; `calls` are `Blueprint.call` values (section 9) |
| `host`, `builtOn`, `reaches`, `via`, `takes`, `render`, `replay`, `ships` | — | — | ✔ | projections.md section 1; `render` takes a project and returns files, as an Effect |

A wrong field, a missing `description`, or an option from another choice is a compile error in TypeScript (M1.05).
`Blueprint.feature` and its kin return frozen objects with `kind: "feature" | "adapter" | "projection"`.

**Projection descriptors** are typed here so a third party can write one (ledger PRJ-14, PRJ-32), but the compiler
reads projection mounts from M1.11: a mount of one is what writes its `generated/<mount>/` (the last section here). **Adapter descriptors** are typed here and mounted from M1.14, which builds their calls (section 9).

## 3. The mount and the four verbs

A mount is one file. Its name is the file's name. It is the only thing a plugin puts in a project.

```ts
// blueprint/features/echo.ts. Scaffolded from @fixture/echo 1.0.0. Yours from now on.
import { Blueprint } from "orthograph";
import echo from "@fixture/echo";

export default Blueprint.use(echo, (p) => [p.choose(p.choices.style.plain)]);
```

`Blueprint.use(plugin, verbs)` returns a frozen mount (`kind: "mount"`). The callback receives a view of the plugin
whose verbs are bound to it; it returns the list of verb results. The verbs:

| Verb | Call | Kinds | Rule the compiler checks |
|---|---|---|---|
| choose | `p.choose(p.choices.style.loud)` | all | one option per choice; an unpicked choice takes its first option; an option of another plugin or another choice is refused |
| include | `p.include(p.calls.refunds.create, p.events.paid)` | adapters | only what is named is reachable (M1.14) |
| narrow | `p.narrow(op, { via: [Via.session, Via.key] })` | features, projections | `via` only removes ways in; an empty `via` is refused (it would empty the operation: use omit) |
| omit | `p.omit(op)` | features | the operation is not in the model, so nothing is generated for it (only `mounts.<name>.omitted` names it, in the model and what is the model: `generated/model/`, `generated/portal/blueprint.json`); a journey's step that runs it is skipped and named, and the journey's other steps run |

`op` is the plugin's own declaration object, imported from its pure entry
(`import shout from "@fixture/echo/blueprint/things/echo/verbs/shout.js"`). The compiler matches it by identity; an
operation that isn't the plugin's is refused naming the mount file. There is no override and no widening.

**Ways in.** `Via` is exported from `orthograph` with the four ways in from K1: `Via.session`, `Via.key`, `Via.device`,
`Via.agent`. In M1, the only door that can tell them apart is MCP, which is `Via.agent`: an operation narrowed without
`Via.agent` has no MCP tool and the MCP door refuses it. The other three are recorded in the model (`via` on the
operation) and enforced when M2.03 gives principals their way in (M2.01 decides `.via` and `.notVia` on roles).
Narrowing by the app's own roles is **not** offered (ledger X-11: K1 kept narrowing provable; `frame/examples/factory.md`
is changed to omit and via).

## 4. Names

- The mount's name is its file's name, lowercase words joined by dashes; anything else (`../escape`, `bad/name`,
  `bad:alias`, a leading digit) is refused, by `ortho add` before it writes and by the compiler naming the file.
- A plugin's own name is the last part of its package name: `@fixture/echo` is `echo`.
- When the mount's name is the plugin's own name, its things keep their names: thing `echo`, operation `echo.repeat`.
  Otherwise each thing is prefixed with the mount's name and a dash: mounted as `fixture`, thing `fixture-echo`,
  operation `fixture-echo.repeat`. Everything generated follows the thing's name, exactly as for an app's own:
  `generated/api/src/fixture-echo/repeat.ts`, `generated/sdk/src/fixture-echo/repeat.ts`, `Sdk.fixtureEcho.repeat`,
  HTTP `POST /fixture-echo/repeat`, MCP tool `fixture-echo.repeat`, span `fixture-echo.repeat`, identifier `FixtureEcho`.
- Refusal codes use the thing's prefix as for an app's things (`code` on the thing, else two letters of its final
  name). Their numbers follow declaration order in `errors`, as for an app's things (D3 #193: a code is never
  silently renumbered), so two errors declared the other way round swap numbers: reordering a released plugin's errors is
  a code change, a major bump. Names, identifiers and tags never depend on order. (Decided in M1.08.) Error class names keep their export names: two mounts can't be told apart by them, so one plugin is mounted
  **once** in M1. A second mount of the same descriptor is refused, naming both files. Mounting one plugin twice waits
  for per-mount error names, recorded in `later.md`.
- Nothing about a plugin is written as a string by the app: the mount imports the package; names come from paths.

## 5. Choices and settings

```ts
Blueprint.choice({ plain: "…", loud: "…" })     // a choice: its options, each with what it means; the first is the default
echo.choices.style.loud                           // an option, an object: { kind: "option", choice, key }
```

- `choices` may nest plain objects (`signer: { node: Blueprint.choice(…), browser: Blueprint.choice(…) }`); a choice is
  named by its path in them (`signer.browser`).
- The model records each mount's picked options by name (`chosen: { style: "loud" }`), so a changed pick changes the
  mount's hash and stales exactly the operations that depend on the mount (section 7).
- A handler asks what was picked with `Mount.picked(option)`, an `Effect<boolean>` from `@orthograph/language-effect`.
  The generated server provides each plugin's mount to its own handlers; a handler never reads another plugin's mount.
- **Settings** (shape only): `Blueprint.setting.list(ChainId, { min: 1 })` in the descriptor's `settings`; each
  environment gives it, `settings: [wallets.settings.chains.is([1, 8453])]`, by importing the mount. M1 types this
  shape so a descriptor written today keeps compiling; reading settings in the model and delivering them to handlers
  per environment is a later slice (recorded in the ledger, owner to be given by the conductor).

## 6. Needs

```ts
needs: [auth, Blueprint.need(eip1193, { when: choices.signer.browser.injected })]
```

- A need is another plugin's descriptor. The compiler meets it with the app's mount of that descriptor (identity),
  whatever the mount is named, or
  refuses: `blueprint/features/wallets.ts: @orthograph/wallets needs @orthograph/auth, which isn't mounted: ortho add
  feature @orthograph/auth`. A need with `when` applies only if the mount picked that option.
- A need is never met by a copy inside the plugin, so an app has one of each, however many plugins use it.
- `Blueprint.need(x, { atLeast })` (the agents feature, FEA-08 and G-15) is not in M1; it is decided with M4's agents.
- `ortho add` lists each need as met (naming the mount) or not (naming the command that mounts it). It does not install
  or mount a need by itself in M1; `ortho check` and the compiler refuse until it is met.

## 7. What a mount adds to the model

The model gains a `mounts` section, present only when there are mounts, so plugin mounting alone adds no mount metadata to a project that mounts nothing:

```jsonc
"mounts": {
  "echo": {
    "kind": "feature", "file": "blueprint/features/echo.ts",
    "package": "@fixture/echo", "version": "1.0.0",
    "integrity": "sha256-…",            // the installed package's files (paths relative to it, and bytes), not node_modules
    "chosen": { "style": "plain" }, "omitted": ["echo.shout"], "narrowed": { "echo.repeat": ["key", "session"] },
    "needs": ["feature:auth"],
    "hash": "…"
  }
}
```

Each thing and operation that came from a plugin carries `from: { "kind": "feature", "mount": "echo", "package": "@fixture/echo",
"version": "1.0.0", "thing": "echo" }` (`thing` is the plugin's own name for it). A plugin operation's `file` is the
specifier of its pure declaration, `@fixture/echo/blueprint/things/echo/verbs/repeat.js`, which generated code imports
and every loader resolves from the project's root. An app's own declarations keep `blueprint/…` paths and carry `from: { kind: "app" }`. See [M1.03](M1-model.md).

**The graph.** `Compare.dependsOn` adds `feature:<mount>` (or `adapter:` or `projection:`) with the mount's hash to every
operation that came from it, and `Compare.hashOf` answers those keys. `ortho impact` prints the edges first, sorted
and without duplicates, one per line:

```text
feature:echo -> echo.repeat  provides
feature:wallets -> feature:auth  needs
```

`used-by` edges, from an app operation's `step.call` or `step.use` to the mount it reaches, arrive with those steps in
M1.14. A changed pick, a changed `omit` or `narrow`, or changed bytes in the installed package (even at the same
version) change the mount's hash and stale only its operations; an unrelated operation keeps its hash. A plugin whose
`package.json` or declared `blueprint` folder is missing fails closed in the model, naming the package; a missing
handler module is refused at `generate` (section 8).

## 8. Behaviour, hosts and the import rule

- The generated server imports a plugin operation's handler from `<package>/src/<thing>/<verb>.js` and its declaration
  from `<package>/blueprint/…`, never from a copy. `src/` in the app gains nothing.
- A server operation whose handler module is missing is refused at `generate`, naming the operation, the package and
  "worker". Nothing is shimmed.
- The plugin's `layer`, when present, is provided to that plugin's handlers only, on every door (HTTP and MCP), and its
  services stay in the context the routes capture.
- **The import rule (amends `AGENTS.md`, ledger LAH-28, X-27, PLU-06).** Generated code may import, besides the
  language's runtime, `orthograph`, the host and project code: a mounted plugin's descriptor and `blueprint/*` entries
  everywhere, and its `src/*` entries for the host the generated file runs on. API and SDK code import only the two pure
  entries. Worker code never imports a `.node.js` or `.browser.js` entry. Project code never imports a plugin's `src/*`.
  This is checked on the real import closure (esbuild's metafile), never by tree shaking (M1.09).
- **K7 F1.** F1 proposes one generated entry per operation, with a manifest `ortho check` checks. This layout is already
  one module per operation per host, found by path; if F1 is decided as proposed, the package gains a generated manifest
  of those entries beside `orthograph` in `package.json`, and `check` refuses an entry not in it. Mounts, names and the
  model don't change. Nothing of the manifest is built here.

### 8.1 Operations on the device (M1.27, as built; K7, ledger `LAH-02`, `G-10`)

The lead's calls on what the row left open, and what building showed.

- **Accepted when a plugin supplies the code.** `runs: "client"` is accepted for a plugin's operation (`from` set) and
  nowhere else: an app's own operation still gets `runs "client" is not supported yet` (it has no package to hold three
  host entries). `chain` is still refused. A client operation must be `allowed: [Blueprint.anyone]` (no server knows who
  calls), and has no `move`, no `idempotent` and no call step; each is a refusal at the model naming the file. The call
  step is left for the wallet plugin (M1.29), which needs it.
- **Every host entry is required.** `src/<thing>/<verb>.node.js`, `.browser.js` and `.world.js`. A missing one is refused
  at `generate`, nothing written, naming the operation, the package and the host word, as a missing worker handler is
  (`generators/sync/internal/handlers.ts`). A client operation has no `<verb>.js` worker handler, and none is asked for.
- **How the generated client reaches an entry: refined.** The lead's call was the plugin's `exports` conditions. Building
  showed the fixture's `package.json` (and so the shape check 09's wallets share) exports `./src/*` with no condition, so
  `<pkg>/src/receipt/stamp.js` is no file. The conditions are therefore the generated SDK's own: `generated/sdk/package.json`
  (written only when the project has a client operation) maps `#host/<thing>.<verb>` to `{ browser: <verb>.browser.js,
  node: <verb>.node.js, default: <verb>.browser.js }`, and the SDK file imports `#host/<thing>.<verb>`. Node, esbuild
  and tsc (nodenext) all honour `imports` conditions, so the host picks its entry and a browser closure never holds the
  `node` one. `world` is never a condition: prove's journey runner names `<verb>.world.js` itself. Section 8's rule gains
  its one exception as the lead set it: a client operation's host entry, and nothing else of `src/`, may enter the client
  closure of the host it is for; the worker closure holds none of it (check 11 asserts it on the worker bundle).
- **What the server does not see.** A client operation has no route, no handler type, no MCP tool, no handler scaffold
  and no served handler. `generated/api/src/<thing>/<verb>.ts` holds only its `declaration`, which the SDK and the CLI
  read. The portal and docs still list it with its steps.
- **How it runs.** `Device.serve` (`@orthograph/language-effect/device`, a subpath so a browser takes no MCP server)
  runs the plugin's handler under its mount (`Mount.serving`), as an anonymous caller, with the same step spans a served
  operation has, and checks the answer against its declaration. The generated SDK function is `Sdk.<thing>.<verb>(payload)`,
  as for a server operation, and needs only what `Sdk.layer(url)` provides, which now also holds where spans go.
- **Spans** leave as OTLP/HTTP JSON from the process to `<endpoint>/v1/traces`; the endpoint is `Sdk.layer`'s third
  argument, which defaults to `OTEL_EXPORTER_OTLP_ENDPOINT`. The exporter is a layer built for the call and closed when
  it ends, so the flush happens before the call returns and before a CLI exits. No endpoint, no export.
- **A device step's kind stays an ordinary step** (`wait` in the fixture); no new `Blueprint.step.*`.
- **Evidence.** `design/evidence/M1.27/`: check 11 passes 8/8, checks 00 to 08 and 10 stay green.
- **Done in M1.29** (section 8.2): prove runs a client operation through its `world` entry; the call step on the device was
  not needed.

### 8.2 The wallet plugin, as built (M1.29; K7 F4, F5; the builder's calls where the contract was open)

`@orthograph/wallets` is `packages/wallets`: the stand-in's declarations (the contract of check 09 and of the journeys'
README), the four journeys byte for byte the author's, and a host entry per operation per host. Where the contract left
a choice, this is what was decided, with the evidence in `design/evidence/M1.29/`.

- **One line per host entry.** `src/wallet/<verb>.{node,browser,world}.ts` is `Operations.on(<Host>.signer).<verb>(payload)`;
  everything else is in six-slot modules under `src/modules/` (`account`, `chain`, `keystore`, `keyfile`, `signer`,
  `submit`, `operations`, `node-host`, `browser-host`, `world`, `server`). The package builds to JavaScript with `tsc`
  (`nx build wallets`), the shape every plugin ships (section 1).
- **The signers.** Each is a `Signer` (create, import, keys, sign, send) and the host gives the ones it has; one it has
  not refuses as `KeyLocked`, saying why in a log first. `node`: Web3 Secret Storage v3 files, one per label, in
  `ORTHO_WALLET_HOME`, locked with `ORTHO_WALLET_PASSPHRASE` (scrypt at geth's standard cost; a world uses light cost); with
  no passphrase keys list and nothing signs. `browser`: EIP-1193; a wallet has no names for its accounts, so the signer keeps
  a book of labels, `create` takes the next account the wallet offers that has no label (`KeyLocked` if none), `import`
  binds a label to an account the wallet holds (named by its CAIP-10 text), and a send is simulated by the chain port
  first, so a doomed transfer is refused before the person is asked to approve anything, then handed to
  `eth_sendTransaction` and followed. `keystore`: a server's key store; on the node and browser hosts it is absent (a
  server's keys are reached by a server operation, M2.04); in a world it is an in-memory store; a server operation uses
  `Server.keystore({ secret, chain })` from `@orthograph/wallets/server`. `world`: the world's test wallets, in memory.
- **Labels are never overwritten.** `create` on a label that exists answers the key it has; `import` of the same key under
  its label answers it, of another key is `KeyLocked`. A keystore file is written with `wx`.
- **A browser's `create`** is the one place the signer cannot make a key itself. Accepted because the journey's
  `create` then `import` then `keys` (1 then 2) needs `create` to succeed with a key that is not the funded one, and
  because a real wallet's `eth_requestAccounts` is the only EIP-1193 way to be given an account.
- **Chain setting.** `ORTHO_WALLET_CHAIN` (CAIP-2, default `eip155:1`) and `ORTHO_WALLET_RPC_URL`, read through Effect's
  `Config`; a browser, with no process environment, sets `globalThis.ORTHOGRAPH_WALLET`. Nothing in the payload names a
  chain, so it is a setting of the host (section 5: a value that differs by environment is a setting), never a choice.
  `to` must be an account on the signer's chain; another is refused as `SimulationReverted` before anything is prepared.
- **`confirmed`.** A plain transfer has no declared event of its own to wait for, so K7 Q3's "the follower saw the
  declared event" has nothing to match. The intent is the transfer itself: `level: "confirmed"` is included in a block and not
  reverted, at depth one, which is a local chain's level. A mined revert after a passing simulation is
  `SimulationReverted`. An unreachable chain, a timeout or a replaced transaction is a defect that says what.
- **Ids and secrets.** `wallet` is `wal_` and sixteen characters of the address (the same key has the same id on any
  signer). `import`'s `source` is `Blueprint.visibility.secret`: it is recorded nowhere. `signer`, `label`, the
  transaction hash and `level` are `Blueprint.traced`: the secrets eval otherwise reads a journey's name or the chain's own
  span as a leak of the text "node" or "confirmed". These are additions to the stand-in's declarations, as its README allows.
- **How prove runs a client operation.** With a `DeviceHost` (given by `Prove.run` when a mounted plugin has any),
  `Journeys.run` runs the plugin's `<verb>.world.js` in its own process (`journeys/internal/device.ts`): the operation
  served by `Device.serve` under the app's mount as an anonymous caller, the call's span the child of the journey's own so its
  trace reads back as a served call's, recorded as 200 with the answer in wire form, 422 with `{ _tag, code, … }` for a
  declared refusal, or 500 for a defect, whose `defect` attribute is what the report quotes (`BlankReached`). The
  proof's handler hash for a client operation is the hash of its `world` entry. Device spans now leave with the logs
  written inside them (`OtlpLogger`), because the explainability eval looks for the log that decided a refusal.
- **What a world with a chain gives** (the journeys' README, assumption 5): prove stands Anvil as a process of the run's
  scope (always `--silent`, released after the Worker), with `chain.keys.<host>` for `node`, `browser`, `keystore` and
  `world`, and `chain.payee`. A secret key for the three that hold one; for `browser`, the CAIP-10 account its provider
  holds (the provider is the world's test EIP-1193 provider, which holds that account and an empty one). The keys are
  generated by the world, `Redacted` in `DeviceWorld`, and are text only inside a call's payload. Without `anvil` on the
  path the world has no chain and says so; the steps that need it then read `nothing at world.chain…`.
- **A reserved verb.** The wallet's `import` made the generator write `export const import`. The SDK, the CLI and a scaffold
  now bind such a verb as `import_` and export it under its name (`export { import_ as import }`), so `Sdk.wallet.import`
  and `wallet import` work. Apps with no such verb generate byte for byte as before.
- **No call step on the device.** The stand-in's declarations carry no steps and `send` reaches the chain through
  `@orthograph/chain-evm/device` as a library (its port and its spans), so the refusal of a call step in a client operation
  stays, with its reason corrected. It lifts when an adapter needs it.
- **`@orthograph/chain-evm/device`** is the package without `Anvil` (no `node:` import), so a browser's or a Worker's
  closure can hold the port and `Keys`; `Keys` is new there (generate, a signing `Key`, keccak-256, addresses), so no other
  package imports viem.
- **A gap in the journeys, for their author.** The four journeys reach only `SimulationReverted`, so the coverage eval
  reports every other declared refusal (`KeyLocked` on all five operations, `NoSuchKey` on `sign` and `send`) as reached
  by no journey: an app mounting the wallet passes every other eval and fails `prove` on coverage. The contract (their
  README) declares those errors, so they are declared; the fix is journeys that reach them (a locked node keystore, a send
  or a sign for a label that is not there), written by an author, not here.
- **Not built.** A server operation signing in a real Worker: the signer (`@orthograph/wallets/server`, an export of its own so
  project code never imports a plugin's `src/*`) is proved in a served operation on Anvil (`server.test.ts`) with a key the world
  generated, but a Worker handler has no way yet to be given a secret as a binding (secrets are M2.04), so no generated Worker
  runs it. A browser's wallet is proved against a stand-in provider, not a real extension (ledger `PRF-12`).

## 9. Adapters, harvested from D4 section 3 for M1.14

The surface M1.14 builds and checks `03` and `04` judge; M1.14's builder may refine it only through its own decision
step:

```ts
// @fixture/remote: src/adapter.ts
export default Blueprint.adapter({
  description: "Prices from the remote service.",
  calls: { quote: Blueprint.call({ mode: "promise", errors: [PriceUnavailable] }) },  // mode "promise" (default) or "effect"
  standIn: Stand.process(...),
});
// its src/calls/quote.js exports the callable; argument and answer types are inferred from it, never retyped
```

```ts
// blueprint/adapters/pricing.ts
export default Blueprint.use(remote, (r) => [r.include(r.calls.quote)]);
// blueprint/things/allowance/verbs/grant.ts
steps: { price: Blueprint.step.call(pricing.calls.quote) }
```

D4 section 3's semantics hold for the step's runner: Promise mode calls lazily inside `Effect.tryPromise`, the raw wait
alone is uninterruptible and counted until it settles, a synchronous throw and a rejection reach the handler as
`unknown`; Effect mode keeps the callable's typed failure and its service requirements, and maps nothing. The one
blank is the handler's error mapping, scaffolded as a `Handlers.blank`; an unmapped failure is a defect. Foreign
callables and their types never enter a pure entry or a client closure. The step's span is
`<thing>.<verb>.<step>` with `kind: call`; foreign failure payloads are not logged.

### 9.1 As built in M1.14 (what the surface above became)

Recorded by M1.14's builder, 18 November 2026. Each line refines or fixes a place section 9 left open; the evidence is
checks `03` and `04` and the unit tests named in the module READMEs.

**The mount hands out the adapter's calls; the compiler decides reach.** `Blueprint.use(adapter, …)` returns a mount with
`calls`, the adapter's own call objects, so `pricing.calls.quote` always loads; a name the adapter has no call by answers
`{ kind: "missing-call", name }` (a `Proxy`), so a refusal can name it. `include` is checked when mounts are folded and
`step.call` when operations are described, and every problem names the mount file:

```text
blueprint/adapters/pricing.ts: includes the call notExported, which @fixture/remote doesn't have (its calls: quote)
blueprint/things/probe/verbs/quote.ts: step price calls quote of @fixture/remote, which blueprint/adapters/pricing.ts doesn't include: add p.include(p.calls.quote) there
blueprint/things/probe/verbs/quote.ts: step price calls quote, which may fail as PriceUnavailable: declare it in the operation's errors
```

The last is new: a call's `errors` are the errors its mapping may return, so the operation must declare each of them
(they are its wire refusals). A call is matched by identity, never by a written name.

**What the model records.** `mounts.<name>` of an adapter gains `calls` (the included ones, by the adapter's name for
each), `layer: true` (its declared `src` folder has a `layer.js`) and `standIn` (`{ how: "process" | "vendor", what }` or
`{ how: "none" }`, as `Stand.process`, `Stand.vendor` or `Stand.none` declared it on the adapter), all in the mount's
hash. An operation's step gains `call: { mount, call, mode }` (`steps.price.type` is `call`). The adapter's `things/`
(where its errors are declared, with their code prefix) are folded like a feature's, so its errors have codes and wire
classes: a thing named as a feature's is (`<mount>-<thing>` unless the mount has the adapter's own name), with no
operations. `Compare.dependsOn` gives an operation that calls `adapter:<mount>` with the mount's hash, and `edges`
prints `adapter:pricing -> probe.quote  used-by`.

**The step's runner (`@orthograph/language-effect`, module `calls`).** The generated server imports each callable
(`<package>/src/calls/<call>.js`, its default export) and the adapter's `layer`, and gives them to `Handlers.serve` as
`calls: { price: { run, layer } }`; the handler never imports either (project code never imports a plugin's `src/*`),
and neither enters `generated/api` or `generated/sdk`. The handler holds the step as
`steps.price(args, failure)`: the callable's arguments as a tuple, and the one mapping, `(failure: unknown) => <error>`.
Its types come from the callable: `generated/server/handlers/<thing>/<verb>.ts` carries `Handler` with each call step
typed by `typeof` its callable, in `generated/server` where no client reaches it.

- Promise mode: `Effect.uninterruptible(Effect.tryPromise(...))` around the call alone; the mapping runs outside it.
- Effect mode: `Effect.suspend` of the callable, with the adapter's layer provided (a layer that fails to build is a
  defect); the mapping sees only the typed failure, so a defect and an interruption pass through unmapped.
- Whatever the mapping gives is checked against the call's declared `errors` by class: anything else (a throw, an
  undeclared error, an unwritten blank) is a defect, never a refusal. The step logs `<step> failed, and was refused as
  <Error>` itself, inside the operation's span, naming the refusal and never the foreign failure; that is the deciding
  log `explainability` looks for, so the lint rule `refusal-has-log` exempts a `new <Error>(…)` that is the body of the
  mapping function given to a `steps.<key>(…)` call.
- A layer is provided per call (built each time). Sharing one build across calls waits for an adapter whose layer holds
  a resource.

**The one blank.** The scaffold of an operation with call steps (`src/<thing>/<verb>.ts`, written once) wires the
callable by the payload's field names and leaves `Handlers.blank("…", "failure")` in the mapping's place: typed as a
function, so the file type-checks until it is written, and a call that reaches it is a defect naming what is missing.
When the call is the whole operation, the scaffold returns what the callable answered, so the answer is the callable's.
The scaffold names no error: the author imports the one the mapping returns.

**Not built here.** Events in (`include` of `p.events.*`, the door and the `service(<mount>)` principal), an adapter's
secrets, and running a stand-in in a world are adapters.md's other five things; M1.14 declares and records the stand-in
and nothing runs it yet (the world that starts it is the host's, with M1.27 and M1.30).

## 10. A plugin's journeys

A feature's `blueprint/journeys/*.js` run on every `ortho prove` of the app that mounts it, in the app's worlds, beside
the app's own, so a feature's operations are covered by its own journeys. A step that runs an omitted operation is
skipped and named (`  skipped "<step>": it runs echo.shout, which blueprint/features/echo.ts omits`), the journey's
other steps run, so what the mount keeps is still covered, and prove still passes. (Built in M1.07: skipping the whole
journey would leave the kept operations it covers uncovered.) Span names follow the mount's names and `spans()` takes written names, so a
plugin's journeys assert no spans in M1; the declared-steps eval still judges them. Starting-world fragments stay open
(mounting.md).

## 11. `ortho add feature|adapter|projection`

```text
$ ortho add feature @fixture/echo
wrote blueprint/features/echo.ts
pinned @fixture/echo 1.0.0 (local: no registry release to age)
needs none
next ortho generate, then ortho check
```

- Arguments: `<package> [--as <name>] [--dry-run]`. `--dry-run` prints `would write …` and writes nothing.
- It reads the installed package. A package that isn't installed is refused with the install command
  (`pnpm add --save-exact <package>`); a package with no `orthograph` key or another `kind` is refused.
- It pins exactly: the dependency in `package.json` becomes the installed version with no range.
- R1, three days: when the package came from a registry, its version's publish time is read from that registry and a
  version under three days old is refused unless the package is named in the project's `minimumReleaseAgeExclude`
  (pnpm's own override, with its reason). A package from no registry (a local tarball or link) says so and is pinned.
- It writes the mount with each choice's first option picked (`p.choose(p.choices.style.plain)`, the callback's
  parameter `p` so it never shadows the import), and refuses to overwrite an existing mount
  (`blueprint/features/echo.ts already exists`), leaving it byte for byte.
- It is one command: after it, `ortho generate`, `ortho check` and `ortho prove` work with no other step. Its last line
  says to generate first, because `check` holds `generated/` to the blueprint (section 12).
- Each need is listed at the first picks: `needs @x/auth: met by blueprint/features/auth.ts`, or
  `needs @x/auth: not mounted: ortho add feature @x/auth`. Nothing is mounted for it.
- Whether a release came from a registry is read from the project's `pnpm-lock.yaml` (an `integrity` with no `tarball`
  or `directory`); its publish time from `npm_config_registry`, else npm's registry.

## 12. What `check` refuses, each naming its files

`check` keeps its drift rule after a mount is written by hand: `generated/` must be what the blueprint gives, so a
hand-made mount is followed by `ortho generate` before `ortho check` passes (`ortho add` says so in its next steps).
A problem found in a plugin's own files names its package path and is prefixed with the mount file that brought it in.

Two things with one name (app and plugin, or two plugins); two refusals with one name; two things with one code
prefix; a plugin thing using `AR`, reserved for the runtime; one descriptor mounted twice; a mount name that isn't
lowercase words with dashes; an unmet need; an option of another plugin or two options of one choice; `omit` or
`narrow` of an operation that isn't the plugin's; an empty `via`; two error classes with one tag in an operation's
union; a server operation whose handler module is missing. Each message names the app file and the package path.

## 13. K5, folded in

- **Seams.** A plugin's things and operations are an app's things and operations: every seam K5 draws for an operation
  (decode, role, span, request key, machine, steps, answer, commit) is the same wrapper, so a plugin gets each for free.
- **`emits:`** (Q5, M3.16) and **optional steps** (`Blueprint.step.<kind>({ optional: true })`, M1.26) are fields of an
  operation, read by the same layout reader, so the descriptor neither blocks nor duplicates them.
- **Stores** (K3, M1.17): a feature's `blueprint/stores/` folder is read by the same reader, and its stores are named by
  the mount, as its things are.
- **The SDK contract** (seam 5, M1.12) and **actions** (M1.22) see plugin operations like the app's.

## 14. Which check proves which slice

| Check (`e2e/m1`) | Proves | Slice |
|---|---|---|
| `00` controls | the fixture packs and installs for real; a project with no mounts generates as before and proves its nine evals | M1.02 |
| `01` mounting | a mount by hand (M1.06) and through one `ortho add feature` (M1.10): names, provenance, files, refusals | M1.06, M1.10 |
| `02` runtime and closures | SDK, HTTP and a first MCP call answer from the plugin's handler in workerd; prove runs its journey; closures | M1.09 |
| `03`, `04` adapters | adapter mounts, `step.call`, D4 section 3's Promise and Effect semantics | M1.14 |
| `05` graph | edges, `feature:` keys, staleness by pick and by bytes, fails closed, order-stable | M1.08 |
| `06` collisions and needs | every refusal in section 12, and needs met or refused by name | M1.08 |
| `07` descriptors | the three descriptors type-check; a wrong field fails to compile | M1.05 |
| `08` verbs | choose, narrow and omit change the model and `generated/` as section 3 says | M1.07 |

All new world and HTTP work in `e2e/m1` uses ports 19260 to 19279.

## 15. The ledger

Closed or folded by this record: PLU-02 (the descriptor decisions), PLU-15 (kit words superseded), X-10 (projection
package names: the projections Orthograph ships are one package, `@orthograph/projections`, exporting `server`, `api`,
`sdk`, `cli`, `mcp`, `docs` and `portal`, so `@orthograph/cli` stays the command's package; a third party's projection
is its own package), X-11 (no narrowing by roles), CMD-19 and X-02 for `add` (three days), ENV-22
(choices fixed at mount time). Given owners: settings in the model and runtime (new, for the conductor to place), mounting
one plugin twice (`later.md`), exports and `step.use` with `used-by` edges (M1.14), FEA-08 and G-15's `atLeast` (M4),
PLU-13's "an app operation calls an omitted one" (M1.14, when app operations can reach plugin ones).

## Builder-edited checks, audited (author, 18 November 2026)

M1.03's builder (PR #64, commit 9f8cebb) edited four checks: `e2e/m1/01-mounting.test.ts`, `03-adapter-mounting.test.ts`, `support.ts` and `README.md`. AGENTS.md doesn't allow that. A ✍️ author who wrote none of the code audited each hunk against section 7 here, [M1-model.md](M1-model.md) and M1.03's row in `milestones.md`:

- **`support.ts`**: `from` is now required, and is `{ kind: "app" }` or `{ kind: "feature" | "adapter", mount, package, version, thing }`. This is the union change itself. Accept as authored.
- **`03-adapter-mounting.test.ts`**: an app operation's `from` was `toBeUndefined()` and is now `toEqual({ kind: "app" })`. The mechanical change. Accept as authored. The assertion sits after the `probe.quote` scaffold, which needs M1.14's code, so it does not run on #64's head; it is correct by reading.
- **`01-mounting.test.ts`**: the two `toEqual` on a mounted thing's and operation's `from` gain `kind: "feature"`, and `before` operations expect `{ kind: "app" }`. Mechanical. The builder also added four assertions that the union change did not require: `echo.shout`'s `from`, `fixture-echo`'s thing `from` (renamed mount), each app thing's `from` is `{ kind: "app" }`, and each app thing is `toEqual` to its pre-mount record. Each one makes the check stricter and follows the row ("every thing and operation") and M1-model.md; none removes or loosens a case. Accept as authored.
- **`README.md`**: assumption 3 now states the union, as M1-model.md does. Accept as authored.

Both edited tests in `01` fail on the code before M1.03 (`c75bbb6^`, with these check files laid over it) and pass on #64's head. In `01` all 16 tests pass on the head. In `03`, 7 of 8 fail on the head at an earlier line (`can't load blueprint/things/probe/verbs/quote.ts`, M1.14's code), none at an edited assertion.

The author found no weakened assertion, removed case or expectation fitted to the builder's code. Verdict: accept as authored; no check was rewritten. One note outside the checks: the same commit range reworded section 7 above ("keeps its model and its generated/ byte for byte" became "adds no mount metadata"). `00-controls` still asserts the narrower claim, that installing fixtures changes nothing for a project that mounts nothing, and it passes. Gate item 2 in `milestones.md` (acme's `generated/` the same as before, byte for byte) cannot hold for `generated/model/model.json` once M1.03 adds `from` and the journeys; no check compares against pre-M1 bytes. The lead should reword that gate item.

## Checks 12 and 13: what their author settled (lead, 19 November 2026)

The design was silent on these, the ✍️ author of checks 12 (M1.11) and 13 (M1.21) decided them in each file's assumptions,
and the lead accepts them as the contract for the builders. Evidence: `design/evidence/M1.11/check-12-red.txt` and
`design/evidence/M1.21/check-13-red.txt`, each red on the missing surface only.

- **The model is a projection too.** Section 15's list gains `model`: `@orthograph/projections` exports `model`, `api`,
  `server` (part one), then `sdk`, `cli`, `mcp`, `docs`, `portal`. Acme mounts each as `blueprint/projections/<name>.ts`,
  `export default Blueprint.use(<name>, …)`; the mount's name is its file's and its output folder follows it.
- **Unchanged means byte for byte except line 1**, which may name the mount (`// Generated from
  blueprint/projections/<name>.ts. Do not edit.`). The model differs only by its new `mounts` key, recorded as
  `mounts.<name>` with `kind: "projection"`, `file`, `package` and `hash`.
- **A mount is what makes the output.** With no `blueprint/projections/server.ts`, nothing writes `generated/server/`: the
  fixed renderer list is gone (M0.03).
- **A step signal is an OTLP log record** at each step's start and end (`step`, `phase`, and `outcome` on `end`), whose
  `spanId` is the step span's own, so the portal joins signals and spans by id (K5 seam 10). "Under `waitUntil`, not at
  dispose" is judged as: the signal is in the Collector's file while the request is still held.
- **The portal's live view is data first.** `Live.call({ source, journal }, trace)` in `@orthograph/portal` is a pure
  Effect over the trace source and the world's journal: steps running or ended, the commit once its span has ended, and
  each event only with a committed commit. Its screens stay M1.13's, on M1.25's design with Aaron; this shape does not
  decide them.

## M1.11: what its builder settled (19 November 2026)

Built to check 12. Where the design was silent the builder decided, and records it here; evidence in
[`../evidence/M1.11/`](../evidence/M1.11/).

- **One package, `@orthograph/projections`** (`scope:projections`, `env:build`, `layer:1`; X-10). It imports `orthograph`
  (`Blueprint.projection`, `Host`, `Ships`), `effect` and, for types only, `@orthograph/compiler`. It never imports
  `generators`, `prove` or a host: the dependency runs the other way, `generators` depends on it. Build-time only, like
  `compiler` and `generators`: what it generates never imports it. A blueprint mounts it as it mounts any plugin, so
  `scope:project` may depend on `scope:projections` (`.oxlintrc.json`, both constraint blocks, and `packages.md`).
- **A package may ship several descriptors.** The compiler's `PluginPackage` gains `descriptors`, every root export whose
  `kind` is `feature`, `adapter` or `projection`, and a mount is matched to the package that exports its descriptor, by
  identity. `default` is no longer required. "Mounted once" is now per descriptor, not per package: `server` and `api`
  are two mounts of one package.
- **The projection's input and output.** `ProjectionInput` is `{ name, model, mount, mounts }` (the frame's `project`);
  `Output.path` is relative to `generated/<mount>/`, and the generators write it there. The model is the compiler's, which
  `orthograph` cannot import, so a projection types it itself.
- **The mount's name is its folder, and the built-ins hold it to their own names.** `generated/server/` and `generated/api/`
  are read by name by `prove`, `check`, `environments` and the other renderers, so `server` is refused when mounted as
  anything but `blueprint/projections/server.ts` (`MountedElsewhere`, naming the file it belongs in). Threading the name
  through is M1.13's, when the portal and docs stop assuming `generated/api`. A third party's projection has no such limit.
- **What a mount writes is named in its first line.** A file a mounted projection renders whose first line is the
  do-not-edit line gets `// Generated from blueprint/projections/<name>.ts. Do not edit.`, done by the generators for every
  mount alike, so no projection spells it. JSON and SQL files have no such line and keep what they have. The diff of acme's
  `generated/` is that one line in each of `server/main.ts`, `server/wrangler.jsonc` and the fifteen `api` files, the
  `mounts` key in `model/model.json` and in `portal/blueprint.json` (which holds the model), and nothing else (PRJ-16).
- **A projection's mount hashes its identity, not its sources.** `mounts.<name>.integrity` of a projection is the digest of
  its `package.json`. Hashing every file (as a feature's) would put `model.json`, `portal/blueprint.json` and the compiler's
  and CLI's acme snapshots out of date on every edit of a renderer, and M1.12 and M1.13 edit this package in parallel. A
  projection owns no operations a changed mount hash could stale; what its sources write is guarded by drift
  (`ortho check`, `no-edited-output`), which is the right test of a renderer.
- **A project that mounts no projection gets the model, the api and the server, as before.** The examples `signup`,
  `starter` and `work`, the starter the preset copies, and a project made with the preset all generate byte for byte what
  they did, with the old first line, because no mount is there to name. The moment a project mounts any projection it
  gets exactly the ones it mounts: that is the rule check 12 judges (no `server.ts`, no `generated/server/`). Only `acme` mounts
  in M1.11; the others gain their mounts with `ortho new` (M2.09) or when part three lands, whichever comes first. This
  keeps the published starter (check 1, from a registry) free of a new dependency until `ortho add projection` exists.
- **What is still fixed.** The SDK, CLI, MCP, docs and portal render as they did (M1.12, M1.13), and so does the blank
  handler scaffold in the project's `src/`, which is the project's own code and no mount's output. The model projection
  writes `model.json` and `edges.json`; `changes.json` is the CLI's.
- **`Render.files` is an Effect.** A projection's `render` is one, so `Render.files({ name, model, root })` is too; `root`
  is where the mount files are loaded from (the model names each mount's `file`; its default export's `plugin` is the
  projection). A mount that can't be loaded, or won't render, fails with its file named: `generate` reports it and `check`
  reports it as drift.
- **`ortho add projection`** is not part of this slice: a projection package has several exports, so the command needs to
  be told which. Acme's three mounts are written by hand, as scaffolds say they may be.
