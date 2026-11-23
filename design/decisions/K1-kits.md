# K1: kits, where code runs, who may reach it, and the builder's day

Decided 17 November 2026 by a 📐 designer thread, under AGENTS.md ("the building agent owns the architecture"). It
answers `design/briefs/K1-kits-and-surfaces.md` (the brief; its marks ✅ 🆕 ❓ are kept below where they help) and is
the decision step **D4** of the build plan. It supersedes D4's draft recommendation in `design/build-plan.md`, and
replaces step L3.01 with the steps in section 5.

Every claim about today cites `origin/layer/3` at `3bacbf3` (read with `git show origin/layer/3:<path>`). Evidence
beyond the brief: the `kit-package-exports` spike (a packed kit with declaration-only and runtime entries, bundled and
run in workerd), the `authenticated-siwe-link` spike (linking a signed wallet to an existing Better Auth session), and
the npm registry (who holds the `@architect` scope). The final tutorial and a sketch of acme with three kits mounted
are in `spikes/kits-dx/`.

**The answer in one paragraph.** Three questions, three places. *Where code runs* is `runs` on the operation. *Who may
reach it* is `allowed` on the operation, and the principal now records the kind of credential it arrived with (`via`:
`session`, `key`, `device` or `agent`), so `grantee.notVia("agent")` is enforced by the runtime on every route, not
just hidden from one. *What exists* is the environment: which credential kinds its identity issues, and what it
deploys and publishes. The generators work out each operation's surfaces from `runs` and `allowed`; nothing names a
surface. A **kit** is a versioned package laid out like a project: a blueprint fragment (things, operations, roles,
events, errors) plus *dependencies* your handlers call, *inbound* entries the outside world calls, and *runtime pieces*
the framework itself calls, each with a real local implementation for worlds. A project mounts it with one file,
`blueprint/kits/<mount>.ts`, whose name is the mount's name. Kit operations take their names from the kit's paths, use
only the kit's own roles, can be narrowed but never widened by the app, and the kit's journeys re-run in the app's
worlds. Tested on six kits, this held, and it forced five corrections to the brief, listed in section 3.3.

## 0. Words decided here

The design's own words win over the brief's where they already exist (threads skill: "use the design's words").

| Word | Means | Instead of |
|---|---|---|
| **dependency** | something your handler calls: methods with payloads, answers and errors, one implementation per host. `decisions.md` (layer 3): "A dependency is something you call". L3.01 already says `architect add dependency`. | the brief's "service" (`Blueprint.service`) |
| **inbound** | where the outside world calls in and is not an operation: a webhook, an OAuth callback, a chain log | `decisions.md`'s "edge", because `generated/model/edges.json` already uses "edge" for the model's graph (45 edges in acme) |
| **runtime piece** | an implementation of something the *framework* calls: `Principals`, the relayer, the follower, the signer that `signedBy` uses | the brief's "runtime pieces", kept and defined |
| **kit**, **mount** | the package; the project's one file that uses it | |
| **via** | the kind of credential a principal arrived with | "exposure", "surface flags" |
| **reach** | the set of `via` (and whether anonymous) an operation admits; computed by the compiler | |

Two inconsistencies found while reading, decided here:

1. **Journeys live in `blueprint/journeys/`.** `prove` reads both places and says so (`packages/prove/src/modules/
   journeys/internal/load.ts:35`: "The docs' place is blueprint/journeys/; a journey written at the project's root
   journeys/ is read too"), and `architect add journey` writes `blueprint/journeys/<file>.ts`
   (`packages/cli/src/modules/add/internal/templates.ts`, `journeyFile`). acme keeps its journeys at the root and the
   brief's tutorial copies it. The starter and every kit use `blueprint/journeys/`; acme moves when it is next touched.
2. **One package per kit, `<scope>/kit-<name>`.** `decisions.md` says "`@architect/std`, of kits" and the build plan
   says `std/wallets`; the brief says `@architect/kit-wallets`. A kit is versioned on its own (an upgrade changes only
   its hashes, section 3.6), a third party's kit must have the same shape as ours, and the spike's export map is per
   package (`/blueprint`, `/worker`, `/node`). So each kit is its own package; "the standard kits" names the set, and
   `packages/std` (an empty stub on layer/3) becomes `packages/kit-<name>` folders. *Which scope* is question Q2.

## 1. Where it runs, who may reach it, what exists

### 1.1 Today, in code

Where it runs is already a field, and only one value is accepted:

```ts
// packages/blueprint/src/modules/operations/types.ts:21-22, :49-50
/** Where an operation runs: `server` (every target today), on the caller's `client`, or on a `chain`. */
export type Runs = "client" | "server" | "chain";
  /** Where it runs. Only `server` is accepted until a target supports another (N1). */
  readonly runs?: Runs;
```

```ts
// packages/compiler/src/modules/model/internal/describe.ts:108
if (op.runs !== "server") problems.push(`${file}: runs "${op.runs}" is not supported yet: ${RUNS_NEEDS[op.runs] ?? "an unknown place"}`);
```

Who may reach it is a role over the thing and a principal that does not say how it arrived:

```ts
// packages/blueprint/src/modules/roles/types.ts:6-8
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string };
```

```ts
// packages/target-effect/src/modules/access/service.ts:59-65
const allows = (a: Allowed, payloadFields: Fields, payload: object, principal: Principal, own: Thing | undefined): Effect.Effect<boolean, never, Records> => {
  if (a.kind === "anyone") return Effect.succeed(true);
  if (principal.kind !== "person") return Effect.succeed(false);
  if (a.kind === "signed-in") return Effect.succeed(true);
  if (a.kind === "role-of") return roleOn(a.role, a.path, payloadFields, payload, principal, own);
  return roleOn(a, undefined, payloadFields, payload, principal, own);
};
```

But the code that makes the principal *does* know the credential kind, and throws it away:

```ts
// packages/host-cloudflare/src/modules/auth/service.ts:15-22 (the HTTP API's principal)
const principalOf = (a: AuthInstance, authorization: string | undefined): Effect.Effect<Principal> => {
  const credential = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!credential) return Effect.succeed(ANONYMOUS);
  const headers = new Headers(credential.startsWith(KEY_PREFIX) ? { "x-api-key": credential } : { authorization: `Bearer ${credential}` });
  return call(a, (auth) => auth.api.getSession({ headers })).pipe(
    Effect.map((s): Principal => (s ? { kind: "person", person: s.user.id, email: s.user.email } : ANONYMOUS)),
```

```ts
// packages/host-cloudflare/src/modules/auth/internal/oauth.ts:47-55 (the MCP server's principal, a separate path)
const verified = yield* Effect.tryPromise(() =>
  auth.api.getJwks().then((keys) => { return jwtVerify(token, createLocalJWKSet(keys), { issuer: issuerOf(origin), audience: mcpResource(origin) }); }),
).pipe(Effect.option);
// …
const principal: Principal = { kind: "person", person: sub, email: user.email };
```

So: an `ak_` key is known at `service.ts:18` (`KEY_PREFIX`, `options.ts:19`); an agent is known because only `/mcp`
calls `oauth.bearer` (`generators/…/render/internal/server.ts:146`). A device-login token is **not** told apart from a
browser session today: "The `bearer` plugin makes the token it issues an ordinary session token" (`host-cloudflare/
src/modules/auth/README.md`). Section 1.3 closes that gap.

What exists is the environment, by fixed surface names, and every operation reaches every surface:

```ts
// packages/blueprint/src/modules/environments/types.ts:25-26
readonly deploy?: { readonly server?: Deployment; readonly mcp?: Deployment; readonly portal?: Deployment };
readonly publish?: { readonly sdk?: Publication | ReadonlyArray<Publication>; readonly cli?: Publication | ReadonlyArray<Publication> };
```

```ts
// packages/generators/src/modules/render/internal/mcp.ts:8-9 (sdk.ts:10, cli.ts:78, server.ts:15 the same)
export const renderMcp = (model: Model): ReadonlyArray<RenderedFile> => {
  const ops = Object.values(model.operations);
```

### 1.2 The decision

| Question | Answered by | Declared in | Enforced by |
|---|---|---|---|
| Where does the code run? | `runs: "server" \| "client" \| "chain"` (`"actor"` later) | the operation | the compiler (which targets exist) |
| Who may reach it, with what kind of credential? | `allowed`, each entry optionally narrowed by `via` | the operation (a kit's operation: the kit, narrowed by the mount) | the runtime, before any handler, on every route |
| Which credential kinds and surfaces exist here? | `identity` (its `via` list), `deploy`, `publish` | the environment | `architect check`, and the identity itself (it issues nothing else) |

No operation ever names a surface. Each operation's surfaces are worked out by the compiler and written into the model
(section 1.4), so generators read them and never work them out, as they already do with refusal codes
(`compiler/…/model/internal/codes.ts:1-4`).

### 1.3 `via`: the credential kind is part of the principal

```ts
// packages/blueprint/src/modules/roles/types.ts (proposed)
/** How a person reached us: a browser session, an API key, the CLI's device login, an agent's OAuth token (MCP). */
export type Via = "session" | "key" | "device" | "agent";

export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string; readonly via: Via };

/** An `allowed` entry that only counts for some ways in. Never narrowed twice; `anyone` has no `.via` (use `signedIn`). */
export interface Narrowed<A extends Role<any> | RoleOf<any> | SignedIn = Role<any> | RoleOf<any> | SignedIn> {
  readonly kind: "narrowed";
  readonly allowed: A;
  readonly via: ReadonlyArray<Via>; // never empty
}
interface Narrows<Self> {
  readonly via: (...via: readonly [Via, ...Array<Via>]) => Narrowed<Self & (Role<any> | RoleOf<any> | SignedIn)>;
  readonly notVia: (...via: readonly [Via, ...Array<Via>]) => Narrowed<Self & (Role<any> | RoleOf<any> | SignedIn)>;
}
// Role, RoleOf and SignedIn gain `Narrows<…>`; Builtin splits into Anyone | SignedIn.
export type Allowed = Role<any> | RoleOf<any> | Builtin | Narrowed;
```

Written by a builder:

```ts
allowed: [grantee]                                       // every way in: acme does not change
allowed: [Blueprint.signedIn.via("session", "device")]   // people at a browser or a terminal
allowed: [holder.notVia("agent")]                        // anyone holding it, except through an agent's token
allowed: [owner.of("organization").via("session")]       // narrowing works on a role-of too
```

Enforced in one place, before any handler, the same refusal as today (`NotAllowed`, `AR-001`, which says nothing more):

```ts
// packages/target-effect/src/modules/access/service.ts (proposed)
const allows = (a: Allowed, payloadFields: Fields, payload: object, principal: Principal, own: Thing | undefined): Effect.Effect<boolean, never, Records> => {
  if (a.kind === "narrowed")
    return principal.kind === "person" && a.via.includes(principal.via) ? allows(a.allowed, payloadFields, payload, principal, own) : Effect.succeed(false);
  if (a.kind === "anyone") return Effect.succeed(true);
  // …unchanged
};
```

Recorded where the credential is checked:

```ts
// packages/host-cloudflare/src/modules/auth/service.ts (proposed): every route resolves every kind
const principalOf = (a: AuthInstance, request: Request): Effect.Effect<Principal> => {
  const credential = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!credential) return Effect.succeed(ANONYMOUS);
  if (credential.startsWith(KEY_PREFIX)) return sessionOf(a, { "x-api-key": credential }, () => "key");
  if (isJwt(credential)) return oauth.bearer(a, request).pipe(Effect.map((b) => (b.kind === "person" ? { ...b.principal, via: "agent" } : ANONYMOUS)));
  return sessionOf(a, { authorization: `Bearer ${credential}` }, (s) => (s.session.via === "device" ? "device" : "session"));
};
```

and the device flow marks its sessions, so `device` is a fact in the database, never a guess from a header:

```ts
// packages/host-cloudflare/src/modules/auth/internal/options.ts (proposed)
session: { modelName: "auth_session", additionalFields: { via: { type: "string", defaultValue: "session", input: false } } },
databaseHooks: { session: { create: { before: (session, ctx) => (ctx?.path === "/device/token" ? { data: { ...session, via: "device" } } : undefined) } } },
```

If Better Auth 1.7.15's hook does not see the path (open risk 1), the fallback is already in our hands: every Better
Auth route goes through `AuthD1.handle` (`service.ts:52-57`), which can mark the session row after a 200 from
`/api/auth/device/token`.

Three rules come with it:

1. **No `via` means every way in.** Nothing written today changes meaning; acme's journeys pass unchanged.
2. **Every route resolves every credential kind,** so an agent's OAuth token on the HTTP API is a person `via:
   "agent"` and is refused by `notVia("agent")`, not by accident. Today it is refused only because `getSession` does
   not understand an OAuth JWT and answers anonymous (`service.ts:19-21`); the first agent that uses the SDK would get
   through every `signedIn` operation.
   Superseded by M2-auth, 21 November 2026: an OAuth token's audience is `/mcp` only, so on the HTTP API it is
   `anonymous`; at `/mcp` every credential makes an agent (`M2-auth.md`, fork 2).
3. **`via` is the credential, not the species.** An agent handed a person's API key is `via: "key"`. `notVia("agent")`
   stops tokens issued to agents through OAuth consent; to stop keys too, write `.via("session", "device")`. The
   generated docs say this on every narrowed operation.
   Superseded by M2-auth, 21 November 2026: a key made for an agent is an agent, so `.notVia(Via.agent)` stops it; a
   person's own key stays `via: "key"` (`M2-auth.md`, fork 2, option A and its rubric).

### 1.4 The generation rule

The compiler writes each operation's reach and surfaces into the model:

```ts
// packages/compiler/src/modules/model/types.ts (proposed additions to OperationModel)
readonly runs: "server" | "client";                       // "chain" when a chain target exists (layer 4)
readonly reach: { readonly anonymous: boolean; readonly via: ReadonlyArray<Via> };   // the union over `allowed`
readonly surfaces: ReadonlyArray<"server" | "sdk" | "cli" | "mcp">;                  // docs and portal: always
// AllowedModel entries gain `via?: ReadonlyArray<Via>`; absent means all four.
```

| Surface | Gets the operation when | How it runs there |
|---|---|---|
| server | `runs: "server"` (plus every inbound entry and runtime piece of every mount) | a route, as today |
| SDK | reach admits `session` or `key` (Superseded by M2-auth, 21 November 2026: not filtered by reach in M2) | a server op is an HTTP call; a client op is local code |
| CLI | reach admits `device` or `key` (`ACME_TOKEN` already carries either, `cli-session.ts:2`) (Superseded by M2-auth, 21 November 2026: not filtered by reach in M2) | the same; client ops run in the CLI process |
| MCP | reach admits `agent` **and** it does not run on the client (an agent has no device) | a tool, as today |
| docs, portal | always | each page says where it runs and who may reach it, by which kinds |

`Blueprint.anyone` admits anonymous callers and all four kinds; `Blueprint.signedIn`, a role or a role-of with no
`.via` admits all four kinds. Client operations take only `Blueprint.anyone` or `Blueprint.signedIn` (optionally narrowed): a role is decided on
records the client does not have. A client operation that needs a server's decision calls a server operation as a
step (section 3.2). `check` refuses a thing role on a client operation, naming the file.

### 1.5 The environment says what exists

```ts
// blueprint/environments/production.ts (acme, proposed)
import { Blueprint, Cloud, Deploy } from "@architect/blueprint";
import auth from "../kits/auth.ts";

export default Blueprint.environment({
  runs: "always on",
  identity: auth.identity({ via: ["session", "key", "device", "agent"] }),   // what this environment issues
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "staging",
  deploy: { server: Deploy.worker({ domain: "api.acme.dev" }), mcp: Deploy.worker({ domain: "mcp.acme.dev" }), portal: Deploy.site({ domain: "acme.dev" }) },
  publish: { sdk: Deploy.npm(), cli: [Deploy.npm(), Deploy.homebrew({ tap: "acme/tap" }), Deploy.binaries({ on: "github-releases" })] },
});
```

`architect check` fails, naming the file and line, when: an environment deploys `mcp` but its identity does not issue
`agent`; it issues `agent` but deploys no `mcp`; it publishes a `cli` but issues neither `device` nor `key`. Turning
agents off in production is deleting one word and one deploy line, and the portal shows it. A new always-on
environment written by `architect add environment` issues `session`, `key` and `device`; agents are added with
`--agents` (section 2.6). Locally every kind is issued, so journeys can prove refusals.

The one place to see "what can agents do" is generated, not hand-kept:

```text
$ architect model --surfaces --env production
operation               runs    reach                         sdk  cli  mcp
allowance.grant         server  session key device agent      ✔    ✔    ✔
allowance.spend         server  session key device agent      ✔    ✔    ✔
wallet.create           client  anyone                        ✔    ✔    ·   runs on the device
wallet.link             client  session key device            ✔    ✔    ·   runs on the device
wallet.complete         server  session key device            ✔    ✔    ·   notVia agent (kit-wallets)
wallet.list             server  session device agent          ✔    ✔    ✔   narrowed by blueprint/kits/wallets.ts
production issues session key device agent · deploys server mcp portal · publishes sdk cli
```

### 1.6 Who may reach it: E against A, B and C

The scenario for all four: `wallet.complete` (binds a wallet to the caller's account) must never be done by an agent;
`allowance.spend` is open to every way in.

**Today** (`origin/layer/3`): there is no way to say it. `generators/src/modules/render/internal/mcp.ts:9` takes
`Object.values(model.operations)`, so `wallet.complete` would be an MCP tool; the HTTP route refuses an agent's token
only because `principalOf` cannot read it (`host-cloudflare/src/modules/auth/service.ts:19-21`).

**A · `expose` on the mount** (the brief's first idea):

```ts
// blueprint/kits/wallets.ts
export default Blueprint.use(wallets, { expose: { mcp: false } });
// blueprint/things/allowance/verbs/spend.ts gains, to be explicit:
expose: { sdk: true, cli: true, mcp: true },
```

**B · one allow-list file per surface:**

```ts
// blueprint/surfaces/mcp.ts
import spend from "../things/allowance/verbs/spend.ts";
import { list } from "@architect/kit-wallets/blueprint";
export default Blueprint.surface([spend, list /* every operation agents may call, kept by hand */]);
```

**C · an audience field:**

```ts
// kit-wallets/blueprint/things/wallet/verbs/complete.ts
export default Blueprint.operation(Wallet, { …, allowed: [holder], for: ["people"] });
```

**E · the credential kind in `allowed`** (recommended):

```ts
// kit-wallets/blueprint/things/wallet/verbs/complete.ts
export default Blueprint.operation(Wallet, { …, allowed: [Blueprint.signedIn.notVia("agent")] });
// acme's spend.ts: unchanged, `allowed: [grantee]`
```

**You do X → what happens**

| Scenario | A · expose | B · allow-list | C · audience | E · via in allowed |
|---|---|---|---|---|
| An agent posts `wallet.complete` to the HTTP API with its OAuth token, once routes read every credential | ❌ succeeds: hidden from MCP only | ❌ succeeds: the list is a catalog | ⚠️ refused only if a second check reads `for` | ✅ `NotAllowed`, the same check as every role |
| You add `allowance.report` | reaches every surface unless you remember `expose` | reaches no agent until you edit `mcp.ts` | must pick `for` | reaches every way in; narrow it if not |
| "What can agents do in production?" | grep every mount and op | read `mcp.ts` | grep `for:` | `architect model --surfaces --env production` |
| Turn agents off in production | ⚠️ edit mounts and ops | ⚠️ empty `mcp.ts`, but it is per project, not per environment | ⚠️ | ✅ the environment's `identity.via`, one word; `check` catches the stale `mcp` deploy |
| The app wants a kit's op tightened | `expose` per surface, by name | edit the list | can't, `for` lives in the kit | `Blueprint.narrow(complete, { via: [...] })` in the mount, by reference |
| A role name or surface name written as a string | ❌ `mcp`, `sdk` keys everywhere | ✅ by reference | ⚠️ `"people"` strings | ✅ by reference; `via` values are a closed literal set |

**Rubric**

| Axis | A · expose | B · allow-list | C · audience | E · via in allowed |
|---|---|---|---|---|
| Floor-first | ✅ a filter in four renderers | ✅ one new file kind | ✅ one field | ✅ one field on the principal, one combinator, one check |
| Reversibility | ✅ | ✅ | ⚠️ every op carries `for` | ✅ unnarrowed ops never mention it; removing `.via` restores today |
| Blast radius | ⚠️ renderers + every mount | ⚠️ renderers + every new op | ⚠️ every op | ⚠️ roles, identity, access, MCP auth (4 modules, about 120 lines) |
| Correctness | ❌ hiding is not refusing | ⚠️ catalog, not refusal | ⚠️ a second authorization beside `allowed` | ✅ refused at runtime on every route; `check` keeps environments honest |
| Parallelizability | ✅ | ✅ | ✅ | ✅ the principal step and the generator lane run side by side (section 5) |
| Fit | ❌ surface names as strings; ignores first-class auth | ⚠️ a second place to edit | ⚠️ duplicates roles | ✅ uses the four kinds Better Auth already issues; names by reference |

**Decision: E.** It is the only option that refuses rather than hides, and it puts the answer where `allowed` already
is. B's real strength, one place to see what agents can do, is kept as the generated `model --surfaces` view and a
portal page.

## 2. The tutorial's proposed commands, exactly

The whole tutorial, start to finish, is `spikes/kits-dx/tutorial.html`. Here is each 🆕 and ❓ from the brief's
section 3: the command, its flags, every file it writes and that file's contents. Rules shared by every `add` and
`new` command, as today (`cli/src/modules/add/README.md`): it never overwrites, writing nothing if any file it would
write exists; every gap is a `Blueprint.todo` that compiles and that `check` names; `--dry-run` prints the files. New:
`add operation` and `add kit` may **insert** into existing files, never changing an existing line, and `--dry-run`
shows the insertion as a diff.

### 2.1 `pnpm create architect <name>`

```text
pnpm create architect <name> [--no-install] [--no-git]
```

**Today ✅** a project already starts from a template: `npx create-nx-workspace acme --preset=@architect/preset` writes
`examples/starter` (build plan L1.50: system, person, session, organization, membership, invitation and API keys, with 5
journeys), and `tools/e2e/starter.sh` proves it from Verdaccio. The brief missed this ("There is no `create`").

**Proposed:** `pnpm create architect <name>` is the package `create-architect` (free on npm today; `npm view
create-architect` answers 404), a thin entry over **the same preset**, so there is one template, `examples/starter`, and
no second one to keep proven. `<name>` is lowercase words joined by dashes, as everywhere (`layout.ts:28`). It asks no
questions and refuses a folder that exists and is not empty. Unless `--no-install`, it then runs `pnpm install`,
`architect generate` and `architect prove --env local`, and prints:

```text
acme: 5 journeys ✔  local
next: architect add thing <name>      (or ask your agent: it reads AGENTS.md)
```

It writes the starter, with four changes to the starter itself (marked ✎):

```text
acme/
  package.json  tsconfig.json  .gitignore
  architect.config.ts                 ✎ name and outputs; `auth` moves to the kit mount (after L3.03)
  AGENTS.md  CLAUDE.md                ✎ new: the rules for agents; CLAUDE.md is the one line "@AGENTS.md"
  .agents/skills/{wayfinder,spike,designer,author,builder,reviewer}/SKILL.md   ✎ new: the design loop (section 4.4)
  blueprint/kits/auth.ts              ✎ new (after L3.03): the auth kit, mounted
  blueprint/values/identity.ts
  blueprint/things/{system,organization,membership,invitation,api-key}/…   person/ and session/ go to kit-auth at L3.03
  blueprint/environments/{local,test,staging,production}.ts
  blueprint/starting-worlds/{founded,invited}.ts
  blueprint/journeys/…                ✎ moved from journeys/: health-is-up, sign-up-and-sign-in, invite-and-accept,
                                         an-invitation-is-used-once, an-owner-makes-an-api-key
  src/…                               the starter's handlers
```

`generated/` is then written by the first `generate`. The contents:

```jsonc
// package.json — versions are the creating CLI's own release, pinned exactly (AGENTS.md)
{
  "name": "acme", "version": "0.0.0", "private": true, "type": "module",
  "dependencies": {
    "@architect/blueprint": "<release>", "@architect/target-effect": "<release>", "@architect/host-cloudflare": "<release>",
    "@architect/portal": "<release>", "@architect/kit-auth": "<release>", "effect": "4.1.1",
    "@effect/platform-node": "4.1.1", "@effect/sql-d1": "4.1.1"
  },
  "devDependencies": { "@architect/cli": "<release>", "@cloudflare/workers-types": "5.20261101.1", "typescript": "<pinned>" },
  "bin": { "acme": "./generated/cli/src/main.ts" },
  "scripts": { "prove": "architect prove --env local" }
}
```

```ts
// architect.config.ts
import { Blueprint } from "@architect/blueprint";

export default Blueprint.config({
  name: "acme",
  // The standard outputs. Rename any here; the folders follow.
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: true, portal: true },
});
```

```ts
// blueprint/kits/auth.ts
import { Blueprint } from "@architect/blueprint";
import auth from "@architect/kit-auth";

// Sign-in, as a kit: people, sessions, API keys, the CLI's device login, and OAuth for agents on MCP.
export default Blueprint.use(auth, { choices: { apiKeys: true, deviceLogin: true, oauthProvider: true } });
```

```ts
// blueprint/environments/local.ts
import { Blueprint, Cloud, Telemetry } from "@architect/blueprint";
import auth from "../kits/auth.ts";

export default Blueprint.environment({
  runs: "on this machine",
  identity: auth.identity.test, // the world signs its cast up for real; every kind of credential, so journeys can prove refusals
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  telemetry: [Telemetry.sink.local()], // prove's Collector, and the viewer while `architect telemetry view` runs
});
```

```ts
// blueprint/environments/test.ts
import { Blueprint, Cloud } from "@architect/blueprint";
import auth from "../kits/auth.ts";

export default Blueprint.environment({
  runs: "a fresh world for each pull request",
  lifetime: "2 hours", // created and destroyed as one unit, with an owner and an expiry
  identity: auth.identity.test,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
});
```

Every other file is the starter's today (`examples/starter/…` on `origin/layer/3`), journeys' imports one folder
deeper. `AGENTS.md` is 30 lines: the
journeys-first rule, the Effect rules, names from paths, `generated/` is never edited, and "read
`.agents/skills/<skill>/SKILL.md` for your job". Each skill is a page: its job, its artifact, its done check (section
4.4).

### 2.2 `architect add thing <name>` with a first draft

```text
architect add thing <name> [--fields <field>:<Type>,…] [--states <first>,…] [--role <name>] [--code <ABC>]
```

- `--fields`: a capitalised type is a value in `blueprint/values/` (`Amount`); a lowercase one is a reference to that
  thing's id (`organization` → `Organization.fields.id`, `person` → the auth kit's `Person.fields.id`). A value that
  doesn't exist yet is written to `blueprint/values/<name>.ts` as `Blueprint.todo("what an Amount is")`.
- `--states`: the machine's states, the first where it starts. Moves come with each verb (2.3).
- `--role`: the role's name instead of `holder`; its rule stays a todo. `--code`: the refusal prefix (`codes.ts:15`).

`architect add thing allowance --fields organization:organization,member:person,limit:Amount,spent:Amount --states
active,exhausted,revoked --role grantee` writes the same six files as today, with these differences:

```ts
// blueprint/things/allowance/thing.ts
import { Blueprint } from "@architect/blueprint";
import { Organization } from "../organization/thing.ts";
import { Person } from "@architect/kit-auth/blueprint";
import { Amount } from "../../values/allowance.ts";

export const Allowance = Blueprint.thing({
  description: Blueprint.todo("what an allowance is, in one sentence"),
  fields: { id: Blueprint.id("all"), organization: Organization.fields.id, member: Person.fields.id, limit: Amount, spent: Amount },
});
```

```ts
// blueprint/things/allowance/machine.ts
export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"],
  moves: {},  // `architect add operation allowance.<verb> --to <state>` adds each move here
  notFrom: { exit: 40 },
});
```

```ts
// blueprint/things/allowance/roles.ts
export const grantee = Blueprint.role(Allowance, { rule: Blueprint.todo("when a person is the grantee of an allowance") });
```

```ts
// blueprint/values/allowance.ts
import { Blueprint } from "@architect/blueprint";
export const Amount = Blueprint.todo("what an Amount is: Blueprint.value(Blueprint.uint(128)), for instance");
```

### 2.3 `architect add operation <thing>.<verb>` as a move

```text
architect add operation <thing>.<verb> [--from <state>,…] [--to <state>,…] [--emits <EventName>]
```

The brief's `--move "active→active|exhausted"` is replaced by two flags with plain commas: an arrow and a pipe are
hard to type and need quoting. `--to` makes the verb a move; `--from` omitted means it creates (`from: []`).
`--emits` defaults to the thing's name and the verb's past tense (`grant` → `AllowanceGranted`; a short table of
irregular verbs, `spend` → `AllowanceSpent`, `send` → `…Sent`, `pay` → `…Paid`), and the command prints the name it
chose. With `--to`, it writes the verb and inserts into two files:

```text
$ architect add operation allowance.spend --from active --to active,exhausted --dry-run
+ blueprint/things/allowance/verbs/spend.ts
~ blueprint/things/allowance/machine.ts
    moves: {
+     spend: { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent },
    },
~ blueprint/things/allowance/events.ts
+ export const AllowanceSpent = Blueprint.event(Blueprint.todo("what AllowanceSpent records"));
```

```ts
// blueprint/things/allowance/verbs/spend.ts
import { Blueprint } from "@architect/blueprint";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Allowance, {
  description: Blueprint.todo("what spend does to an allowance, in one sentence"),
  payload: Blueprint.todo("what a caller sends"),
  answer: Blueprint.todo("what spend answers"),
  move: machine.moves.spend,
  allowed: Blueprint.todo("who may spend"),
});
```

It inserts with the TypeScript compiler API (the compiler already depends on TypeScript), finding the `moves` object
literal and the end of `events.ts`; it refuses, writing nothing, when the move or event already exists or `moves` is not
an object literal. The `machine.ts` import of `./events.ts` as `Events` is added when missing.

**❓ resolved: one file per verb stays.** The compiler names a verb from its path (`layout.ts:77-83`), and hashes,
`impact`, `brief` and the builder's scaffold are per file. `Blueprint.verbs(machine, {…})` in one file would make every
verb's diff touch every other's hash and break names-from-paths. Rejected.

### 2.4 `architect check --ready`, and `Blueprint.question`

```text
architect check [--ready]
```

`Blueprint.question` is a second kind of blank: a decision not made yet, with its options and where it will be
answered.

```ts
// blueprint/kits/wallets.ts, during design
choices: { browserSigner: Blueprint.question("which signer does the browser SDK use?", {
  options: ["passkey", "injected"], answeredBy: "spikes/browser-signer",
}) },
```

It compiles wherever a `Blueprint.todo` does (`blanks` module), and the model lists it under `blanks` with its options.
`check` prints both kinds; `--ready` exits 1 while any remains, in the project or a mount:

```text
$ architect check --ready
✘ not ready: 1 question, 2 todos
  ? blueprint/kits/wallets.ts:6        which signer does the browser SDK use?  (passkey | injected) → spikes/browser-signer
  · blueprint/things/allowance/thing.ts:7   what an allowance is, in one sentence
  · blueprint/values/allowance.ts:2         what an Amount is
```

The portal's plan view shows open questions with their options. A kit may not be published with any blank
(`decisions.md`: "Kits arrive finished, with no blanks").

### 2.5 `architect add journey`

```text
architect add journey "<title>" [--starts <world>] [--cast <name>:<role>,…]
```

As today it writes `blueprint/journeys/<title-as-dashes>.ts`; the flags fill `starts` and `cast`, importing each role
by reference. Written by the ✍️ author, never the builder (AGENTS.md).

### 2.6 `architect add environment <name>`

```text
architect add environment <name> --kind local|test|always-on [--domain <domain>] [--promotes-from <env>] [--agents]
```

`local` and `test` write the starter's two files (2.1) under the new name. `always-on` writes:

```ts
// architect add environment staging --kind always-on --domain staging.acme.dev --promotes-from test
import { Blueprint, Cloud, Deploy } from "@architect/blueprint";
import auth from "../kits/auth.ts";

export default Blueprint.environment({
  runs: "always on",
  identity: auth.identity({ via: ["session", "key", "device"] }), // add "agent" and an mcp deploy to let agents in
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "test", // only a revision with a green verdict there
  deploy: { server: Deploy.worker({ domain: "api.staging.acme.dev" }), portal: Deploy.site({ domain: "staging.acme.dev" }) },
  publish: { sdk: Deploy.npm({ tag: "next" }), cli: Deploy.npm({ tag: "next" }) },
});
```

`--agents` adds `"agent"` to `via` and `mcp: Deploy.worker({ domain: "mcp.<domain>" })`. Without `--domain`, each
domain is a `Blueprint.todo`. It never creates a cloud resource or credential; `promote` does, later, with Aaron's
standing rules.

### 2.7 `architect add kit <package>`

```text
architect add kit <package>[@<version>] [--as <mount>]
```

It adds the package to `package.json` pinned exactly (and refuses a version published less than two weeks ago, as
`pnpm-workspace.yaml`'s `minimumReleaseAge` does), then writes one file. The file's name is the mount's name: the
kit's own name (`kit-wallets` → `wallets`) unless `--as` gives another.

```ts
// blueprint/kits/wallets.ts — `architect add kit @architect/kit-wallets`
import { Blueprint } from "@architect/blueprint";
import wallets from "@architect/kit-wallets";

// Wallets a person holds on their own device, linked to their account. Narrow or omit its operations here, by reference.
export default Blueprint.use(wallets, {
  choices: { browserSigner: "passkey" }, // every choice the kit declares, at its default
});
```

A mounted kit's secrets (the exports of its `blueprint/secrets.ts`) join every deployed environment's secrets
automatically, named by their exports; the environment file names only the app's own, and `architect model` lists both.
For a kit with per-environment choices (chain's `network`), `add kit` inserts a `choose` entry in every environment
file, at the kit's default for that environment kind. Then you run `architect
generate`, and `architect prove --env local` runs acme's journeys and the kit's.

### 2.8 `architect model --graph` and `--surfaces`

```text
architect model [--graph [--from <thing|kit>]] [--surfaces [--env <name>]]
```

`--graph` prints Mermaid from `generated/model/edges.json`, with the new edge kinds `runs-in`, `uses-dependency`,
`calls` (a client op's server step), `inbound-moves` and `from-kit`. `--surfaces` is the table in 1.5.

### 2.9 Kit authoring: `architect new kit`, `add dependency`, `add inbound`

```text
architect new kit <name>                          # a kit package: the layout in 3.4, its example/ proving health
architect add dependency <name> [--host worker,node,browser]
architect add inbound <name> --http <path> | --chain
```

`add dependency mail` writes:

```ts
// blueprint/dependencies/mail.ts
import { Blueprint } from "@architect/blueprint";

export const Mail = Blueprint.dependency({
  description: Blueprint.todo("what mail does, in one sentence"),
  methods: { /* send: { payload: { … }, answer: { … }, errors: [ … ] } */ },
});
```

```ts
// src/dependencies/mail/worker.ts — Scaffolded from blueprint/dependencies/mail.ts. Yours from now on.
import { Layer } from "effect";
import { Blueprint } from "@architect/blueprint";
import { Mail } from "../../../generated/api/src/dependencies/mail.ts";

// The real implementation on the worker. Each failure of the wrapped package becomes one of the method's declared
// errors: that mapping is the one blank (L3.01).
export default Layer.succeed(Mail, Blueprint.todo("Mail on the worker: each method, its failures mapped to its errors"));
```

```ts
// src/dependencies/mail/world.ts — the implementation every local and test world uses: real, local, never a mock
import { Layer } from "effect";
import { Blueprint } from "@architect/blueprint";
import { Mail } from "../../../generated/api/src/dependencies/mail.ts";

export default Layer.succeed(Mail, Blueprint.todo("Mail in a world, such as a local mail sink whose messages are facts"));
```

`add inbound stripe --http /stripe` writes `blueprint/inbound/stripe.ts` (the declaration in 3.2) and
`src/inbound/stripe.ts` (its handler scaffold). In a project these work the same as in a kit: a project's own
dependency is how acme wraps a package nobody has made a kit of.

## 3. What a kit is

### 3.1 Definition

A kit is **a versioned package laid out like a project**, that a project mounts with one file. It contributes four
kinds of thing, and nothing else:

| Kind | What it is | Who calls it | Surfaces |
|---|---|---|---|
| operations (and its things, machines, events, errors, roles, reads) | a blueprint fragment, the same language as the app | people and agents | by section 1.4's rule, like the app's own |
| **dependencies** | methods your handlers call as steps | your handlers | none |
| **inbound** entries | routes or feeds the outside world calls | Stripe, Resend, a chain | server only |
| **runtime pieces** | implementations of what the framework calls | the framework | none |

A kit has no deployment of its own: its server parts go into the app's one Worker (the brief's option C, a separately
deployed service, would split one person's call across two deployments and two role systems). It is not copied in
(option D, every app a fork). It is more than dependencies (option A, where every app would re-declare and re-prove
the same operations); a kit with only dependencies is the special case (email, chain). So: **option B, a mounted
blueprint fragment.**

### 3.2 The four kinds, in code

```ts
// kit-wallets/blueprint/dependencies/signer.ts — a dependency, with an implementation per host and one for worlds
import { Blueprint } from "@architect/blueprint";
import { Address, Signature, Text } from "../values/chain.ts";
import { KeyLocked } from "../things/wallet/errors.ts";
import { browserSigner } from "../choices.ts"; // export const browserSigner = Blueprint.choice(["passkey", "injected"], { default: "passkey" })

export const Signer = Blueprint.dependency({
  description: "Keys held on the person's own device: make one, list them, sign with one.",
  runs: "client",
  methods: {
    create: { payload: {}, answer: { address: Address } },
    list: { payload: {}, answer: { addresses: Blueprint.list(Address) } },
    signMessage: { payload: { address: Address, message: Text }, answer: { signature: Signature }, errors: [KeyLocked] },
  },
  // Implementations are found by path, src/dependencies/signer/<host>.ts; the browser's by its choice,
  // src/dependencies/signer/browser-<passkey|injected>.ts. Host names are a closed set, like `via`.
  hosts: ["node", "browser", "world"],
  choose: { browser: browserSigner },  // by reference to the kit's exported choice
});
```

```ts
// kit-wallets/blueprint/things/wallet/verbs/link.ts — a client operation that calls two server operations as steps
export default Blueprint.operation(Wallet, {
  description: "Link a key on this device to your account, by signing the server's challenge (Sign-In with Ethereum).",
  runs: "client",
  payload: { address: Address },
  answer: { wallet: Wallet.fields.id },
  errors: [KeyLocked],
  allowed: [Blueprint.signedIn.notVia("agent")],
  steps: {
    challenge: Blueprint.step.call(challenge),            // server: an exact ERC-4361 message, stored with the session
    sign: Blueprint.step.dependency(Signer.signMessage),  // here, on the device
    complete: Blueprint.step.call(complete),              // server: verify, consume the challenge, link
  },
});
```

```ts
// kit-payments/blueprint/inbound/stripe.ts — an inbound entry: verified, decoded, and allowed only the moves it names
import { Blueprint } from "@architect/blueprint";
import { machine } from "../things/checkout/machine.ts";
import { StripeEvent } from "../values/stripe.ts";
import { STRIPE_WEBHOOK_SECRET } from "../secrets.ts"; // export const STRIPE_WEBHOOK_SECRET = Blueprint.secret.stored()

export const stripe = Blueprint.inbound.http({
  description: "Stripe tells us a checkout was paid or expired.",
  verify: Blueprint.verify.hmac({ secret: STRIPE_WEBHOOK_SECRET, header: "stripe-signature", scheme: "stripe-v1" }),
  payload: StripeEvent,
  moves: [machine.moves.pay, machine.moves.expire],
});
```

```ts
// kit-auth/kit.ts — runtime pieces: what the framework calls, filled by this kit
import * as Secrets from "./blueprint/secrets.ts";   // export const AUTH_SECRET = Blueprint.secret.generated()
import * as Choices from "./blueprint/choices.ts";   // apiKeys, deviceLogin, oauthProvider

export default Blueprint.kit({
  description: "Sign-in: people, sessions, API keys, the CLI's device login, OAuth for agents on MCP.",
  choices: Choices,
  provides: { principals: Principals.from("./worker/principals"), cast: Cast.from("./worker/cast") },
  runtime: { tables: "auth_", secrets: Secrets },  // names from their exports, never strings
});
```

New pieces of the language this needs, each small:

- `Blueprint.dependency({ methods, runs?, hosts })` and `Blueprint.step.dependency(Dep.method)`. The handler calls
  it as today's steps are called, `yield* steps.sign((yield* Signer).signMessage({ … }))`; the step gives the span, the
  model edge and the method's declared errors. A dependency used by a server op must have a `worker` host.
- `Blueprint.step.call(op)`, only in a `runs: "client"` operation: one server operation, called with the same
  credential. A server operation never calls another operation; it uses a dependency.
- `Blueprint.inbound.http({ verify, payload, moves })` and `Blueprint.inbound.chain({ contract, events, moves })`. An
  inbound handler is not an operation: it has no principal and no surface, may make only the moves it names, and every
  move it makes emits its event as usual, so journeys and `watch` see it.
- `Blueprint.kit({ description, choices, needs, provides, runtime })`, and `Blueprint.use(kit, { choices, narrow,
  omit })`. Every choice and every secret is an export of the kit's `blueprint/choices.ts` or `blueprint/secrets.ts`,
  named by its export: a mount sets a choice by its typed key to one of a closed set of literal values; nothing names
  one by a string.

### 3.3 Tested on six kits

| | auth (Better Auth) | wallets | chain (viem) | payments (Stripe) | email (Resend) | erc20 |
|---|---|---|---|---|---|---|
| Things | person, session | wallet, challenge | none | checkout | delivery | token (per mount) |
| Operations (runs · reach) | `person.sign-up`, `session.sign-in` (server · anyone); `session.show` (server · signed in) | `wallet.create`, `.import`, `.keys` (client · anyone); `wallet.link` (client · not agent); `wallet.challenge`, `.complete`, `.unlink` (server · not agent); `wallet.list` (server read · every way in) | none | `checkout.start` (server · signed in, every way in); `checkout.get` (read · payer) | none | `token.balance` (server · anyone); `token.transfer` (chain · holder, layer 4) |
| Dependencies | `Accounts` (sign up, sign in, create an API key: today's runtime `Auth`, `host-cloudflare/…/auth/service.ts:31-47`) | `Signer` (client) | `Chain` (read, write, receipts), a contract client per ABI, `simulate` | `Payments.refund` | `Mail.send` | `Token.balanceOf` |
| Inbound | `/api/auth/*` (device flow, OAuth provider, discovery), `/device`, `/login`, `/consent` | none | none of its own; the follower feeds others' chain inbound | `/stripe` (HMAC) | `/resend` (Svix signature): bounces | chain: `Transfer` logs |
| Runtime pieces | `Principals`; the world's cast (`castMember`) | the signer `signedBy` uses (layer 4) | relayer actor, follower actor | none | none | none |
| Choices | apiKeys, deviceLogin, oauthProvider; `identity({ via })` per environment | browserSigner | `network` per environment | none (test or live follows the environment's secret) | none | the token's `address` per environment |
| Needs | nothing | auth | nothing | auth | nothing | chain, wallets |
| World implementation | Better Auth on local D1, people signed up for real (today) | test keys: real keys, made per world | Anvil (L3.05) | `stripe-mock`, webhooks signed with the world's own secret | a local mail sink; each message a fact journeys can check | Anvil with a deployed TestUSD |
| server / SDK / CLI / MCP | its routes, Principals / sign-up, sign-in, show / sign-up, sign-in, show, plus `acme login` / sign-up, sign-in, show (by the rule; a mount may omit them) | 4 routes / all 8 (client ops as local code) / all 8 / `wallet.list` only | dependencies only / nothing / nothing / nothing | start, get, `/stripe` / start, get / start, get / start, get (narrow in the mount to stop it) | `Mail`, `/resend` / nothing / nothing / nothing | balance / balance, transfer / balance, transfer / balance |

What the test changed, against the brief:

1. **A kit's operations use only the kit's own roles and the built-ins.** acme's `api-key.create` is allowed to
   `owner.of("organization")` (`examples/acme/blueprint/things/api-key/verbs/create.ts`), a role over an app thing the
   auth kit cannot know. So it stays acme's operation and calls the kit's `Accounts.createApiKey` dependency. Payments'
   refund is the same: a dependency the app wraps in its own operation with its own role. **Rule:** anything that
   needs the app's roles is a dependency; the app decides who may call it.
2. **Agents never link a wallet.** The brief's table gave agents `link`. Linking binds a key to an account, and the
   SIWE spike shows it needs a signature made on the device (`spikes/authenticated-siwe-link/README.md`, "viem
   generates EOA keys and signs messages in Node client memory"). An agent's token being able to complete a link would
   let a delegated tool attach an attacker's address. So `challenge`, `complete` and `link` are `notVia("agent")`;
   agents get `wallet.list`.
3. **`wallet.link` is a client operation over two server operations**, which needs `Blueprint.step.call`. The spike's
   flow is exactly challenge (server), sign (device), complete (server, atomic consume).
4. **Wallets needs auth, not chain.** SIWE needs a chain id, not a chain client. Dropping the edge lets L3.02 run
   without L3.04. EIP-7702 (L3.09) adds chain as an optional need.
5. **An implementation is chosen by host, not by environment.** The brief keyed the keystore by environment (`local:
   "test-keys", production: "passkey"`), but production has both a browser and a CLI, which need different signers,
   and the server never signs. So a dependency names one implementation per host (`node`, `browser`, `worker`) plus
   `world`, and choices are only for real alternatives on one host. Choices that do vary by environment (chain's
   network, a token's address) are set in each environment file with `<mount>.choose({ … })`, by reference: the
   brief's `{ local: …, production: … }` wrote environment names as strings, which AGENTS.md forbids.

### 3.4 The package

```text
@<scope>/kit-wallets/
  package.json                     exports: ".", "./blueprint", "./worker", "./node", "./browser"
  kit.ts                           the descriptor (default export: Blueprint.kit)
  blueprint/things/wallet/{thing,machine,events,errors,roles}.ts
  blueprint/things/wallet/verbs/{create,import,keys,link,challenge,complete,unlink,list}.ts
  blueprint/things/challenge/thing.ts
  blueprint/dependencies/signer.ts
  blueprint/starting-worlds/linked.ts
  blueprint/journeys/{create-and-link,an-agent-cannot-link,an-address-links-once}.ts
  blueprint/index.ts               re-exports every declaration, by reference, for apps to import
  src/wallet/{challenge,complete,unlink}.ts           server handlers
  src/wallet/{create,import,keys,link}.ts             client handlers
  src/dependencies/signer/{node,browser,world}.ts
  example/                         a tiny app that mounts it; the kit proves itself here
  README.md                        what it gives, its choices, what each target gets
```

The `kit-package-exports` spike settles the export shape: a pure descriptor at the root, pure declarations at
`/blueprint`, runtime code per host at `/worker` and `/node`. Its API and SDK bundles' only kit input was
`dist/blueprint.js`; the Worker's closure had no Node entry; a crossed client import was caught by a closure guard
(`spikes/kit-package-exports/README.md`, findings 3 to 5). Two rules follow, both enforced by lint:

- **Generated code may import a mounted kit's declaration entry, and its runtime entry for the host it runs on.**
  This amends AGENTS.md's package rule ("generated code imports only the target's runtime, `blueprint`, the host and
  project code"), as the spike asked. Client outputs (api, the SDK's server calls) import only `/blueprint`.
- **A project never imports a kit's runtime entry**, and never the package a kit wraps (`decisions.md`, layer 3).

### 3.5 Mounting, names and clashes

- **The mount's name comes from its file**: `blueprint/kits/wallets.ts` is the mount `wallets`. The compiler reads
  `kits/` as a place (`layout.ts:54-56` lists the places it reads today), loads the mounted package's `blueprint/`
  files, and names them from their paths, as it names the app's.
- **Names.** When the mount's name is the kit's own name, the kit's things keep theirs: `wallet.create`,
  `acme.wallet.create(…)`, `acme wallet create`, the tool `wallet.list`. When it differs, every thing of the kit is
  prefixed with the mount's name: `blueprint/kits/usdc.ts` mounting `kit-erc20` gives `usdc-token.balance`. That is
  how a kit is mounted twice (`usdc.ts`, `test-usd.ts`). One rule, no `as:` string.
- **Clashes** fail `check`, naming both files and the fix:

  ```text
  ✘ blueprint/kits/wallets.ts: the kit's thing "wallet" (@architect/kit-wallets/blueprint/things/wallet/thing.ts)
    has the name of blueprint/things/wallet/thing.ts. Rename one: renaming this mount file to my-wallets.ts makes the
    kit's thing my-wallets-wallet.
  ```

  Events and errors are named by their exports, and the model's `refusals` is keyed by name
  (`compiler/…/model/types.ts`, `Model.refusals`), so they must not clash either; a prefixed mount prefixes them
  (`UsdcTokenTooLittle`). Refusal codes: every kit thing declares its own `code` (a kit rule), and an app–kit clash is
  today's check (`codes.ts:28-33`), fixed on the app's side with the app thing's `code`, or for a prefixed mount with
  `codes: [[Token, "USDC"]]` in the mount, by reference.
- **Narrowing, never widening.** A mount may `narrow` an operation's reach (`Blueprint.narrow(complete, { via:
  ["session"] })`) or `omit` an operation entirely; both are provably tighter. It may not add roles or `via`. A kit
  author picks the widest reach that is safe; the app tightens.

### 3.6 Across projects

- Each app pins the kit exactly. The kit proves itself in its own `example/` in its own CI, before it is published.
- Each app mounts it with its own choices and narrowing, and `architect prove` runs the app's journeys and the kit's,
  in the app's worlds, with the app's identity. A kit journey that uses an omitted operation is reported as "not in
  this app" (with the mount file and line), not as a failure; one that needs a narrowed-away `via` likewise. A kit
  journey that asserts a refusal still runs.
- The model records `from-kit` on every declaration, with the kit's version, and hashes kit declarations like the
  app's. Upgrading the kit changes those hashes, so `architect impact` names exactly which app operations use a
  changed dependency method or call a changed kit operation, and which proofs went stale. A kit's major version is
  worked out from its model diff, as D3 does for the app's.
- What an app may rely on is the kit's model (its declarations and their hashes), never its handler code.

### 3.7 Authoring a kit

`architect new kit wallets` writes the layout of 3.4 with one health-like operation, a journey and an `example/` that
mounts the kit by a relative path; `architect prove --env local` inside it is green at once. The author then works the
same loop as a project (section 4.4), with three extra checks in `architect check` for a kit: no blanks; every
dependency has a `world` implementation and one for each host its operations run on; and the `/blueprint` entry's
import closure has no runtime code (the spike's guard). `architect publish` publishes it like an SDK.

**Auth is the proving kit.** It is built in today (`architect.config.ts`'s `auth`, `config/types.ts:2-10`), and has
three of the four kinds (operations, inbound, runtime pieces) plus a dependency. Moving it out with acme's journeys
passing unchanged proves the mechanism on something real before wallets (L3.03 before L3.02).

## 4. Journeys, and the design loop

### 4.1 Kits ship journeys

A kit's journeys live in its `blueprint/journeys/` and import its declarations by path, as an app's do. They run in
the kit's `example/` and in every app that mounts it (3.6). The logbook files their verdicts under the mount
(`wallets/create and link`), so the portal shows an app's own proofs and its kits' apart.

### 4.2 Client operations in journeys

Today the runner only calls over HTTP (`prove/src/modules/journeys/internal/world.ts:1`, "Talking to a local world over
HTTP"). A `runs: "client"` operation is run in the runner's own Node process, through the generated SDK's local code,
with each dependency's `world` implementation (test keys for `Signer`). Its `step.call` steps go over HTTP to the world
with the cast member's credential, so the server side is proved exactly as for any call. The client's spans carry the
cast member's trace prefix and go to the same Collector, so `spans({ present: ["wallet.link.sign"] })` works. A
`browser` implementation is proved in the kit's own CI with a real browser (open risk 3), not in every app's journeys.

### 4.3 Proving who may reach it

The cast member chooses the way in; the existing assertions do the rest:

```ts
// kit-wallets/blueprint/journeys/an-agent-cannot-link.ts
export default Blueprint.journey("an agent cannot link a wallet", {
  cast: { olga: Blueprint.signedIn },
  starts: "linked",
  steps: (s) => [
    s.step("olga's agent asks for a challenge", s.olga.via("agent").run(challenge, { address: s.world.address }),
      refuses(NotAllowed), noEvents()),
    s.step("olga's agent cannot see the tool", s.olga.via("agent").tools(), lacks(challenge, complete, link)),
    s.step("olga herself can", s.olga.run(challenge, { address: s.world.address }), expect((a) => a.message).toContain("Sign in")),
  ],
});
```

`.via(kind)` picks the credential and the door: `session` (the default) and `key` and `device` over HTTP, `agent` over
the world's real `/mcp` endpoint with an OAuth access token. The world mints each kind for a cast member at a new
`/_world/credential` route, which exists only where `/_world/*` does (`server.ts`, `hostsWorlds`): a session by
signing in (today), a key by `Accounts.createApiKey` (today's `Auth.createApiKey`), a device token by running the
device flow and approving it server-side, an agent token by Better Auth's JWT plugin with the `/mcp` audience. The brief's
`refusesVia` is not needed. One new assertion, `lacks(...ops)`, checks an MCP catalog.

### 4.4 The design loop: idea to ready-to-build

Each project (and each kit) carries six skills in `.agents/skills/`. They reuse Architect's own thread words where the
job is the same (threads skill), so one vocabulary covers the framework and what is built on it:

| Step | Who (skill) | Artifact | Command | Done when |
|---|---|---|---|---|
| idea → questions | 🗺️ wayfinder | `Blueprint.question(…)` where the declaration will go | `architect check` | the question compiles and the portal's plan shows it |
| question → answer | 🧪 spike | `spikes/<x>/README.md`: question, tried, found, decision, risks | the spike's own runner | the README names the decision, and the question is replaced by a declaration |
| answers → declarations | 📐 designer | blueprint files, mounts | `architect check --ready` | exit 0: no todo, no question |
| declarations → journeys | ✍️ author (never the builder) | `blueprint/journeys/`, `blueprint/starting-worlds/` | `architect prove --env local --unbuilt` | exit 0: every failure is a scaffolded handler not yet written |
| journeys → code | 🔨 builder | `src/` from `architect brief <thing>.<verb>` | `architect prove --env local` | passes, with `check` green |
| code → merged | 🔍 reviewer | a verdict | review of the diff against the brief and journeys | pass |

`prove --unbuilt` is new: it turns "the journeys fail on empty handlers" (AGENTS.md) into a check. It exits 0 only when
the run fails and every failure is a handler still as scaffolded.

## 5. Build order: stage 4 (layer 3)

L3.01 is replaced by L3.01a to L3.01h. L3.02 to L3.10 keep their ids and meaning, with new needs. W3, which needed
L3.01 for a declared dependency (`decisions/F5-work-blueprint.md`), now needs L3.01e.

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| D4 | Decision: the kit format | Gate 2 | none | This record. | ✅ written. |
| L3.01a | `via` on the principal | D4 | blueprint, host-cloudflare, target-effect, prove | `Via`, `.via()` / `.notVia()`, every route resolving every credential kind, device sessions marked, `/_world/credential`, `s.<member>.via(kind)` in journeys. | acme's journeys pass unchanged. A new fixture journey: one person's session, key, device and agent credentials resolve to those four `via`s, and an operation `allowed: [signedIn.notVia("agent")]` refuses the agent token with `NotAllowed` on both the HTTP route and `/mcp`. |
| L3.01b | Reach and surfaces | L3.01a | compiler, generators, cli | `reach` and `surfaces` in the model; renderers filter by them; `check`'s environment cross-rules; `identity({ via })`; `model --surfaces`. | A fixture op narrowed to `session` is in `generated/sdk` and absent from `generated/cli` and `generated/mcp`. `check` fails on an environment that deploys `mcp` without issuing `agent`, naming the file. `architect model --surfaces` prints the 1.5 table for acme. |
| L3.01c ∥ | Project generators | D4 (`add environment`'s `via` needs L3.01b) | cli, create-architect (new) | `pnpm create architect`, `add thing` flags, `add operation --from --to --emits` with inserts, `add journey` flags, `add environment`, `Blueprint.question`, `check --ready`, `prove --unbuilt`. **Scope is question Q1.** | `nx run e2e:create`: in a temporary folder, from Verdaccio, `pnpm create architect demo` (over the existing preset) then `architect prove --env local` prints `5 journeys ✔` with no edits; replaying tutorial steps 2 to 7 by script ends with `check --ready` exit 0 and `prove --unbuilt` exit 0. |
| S-RC | Spike: runs-client | D4 | spikes | Can the generated SDK run a client op with a `node` and a `browser` implementation (conditional exports), call a server op as a step with the same credential, and send its spans to the Collector, with the runner driving it? | Its README, merged, names the export shape and the runner's way of loading client code. |
| L3.01d | Client operations | S-RC, L3.01b | blueprint, compiler, generators, prove | `runs: "client"` accepted; `step.call`; SDK and CLI render client ops as local code; the runner runs them in-process. | A fixture `note.draft` (client) works with the server stopped (`acme note draft`); a fixture client op with a `step.call` passes a journey and shows its client and server spans in one trace; it has no MCP tool. |
| L3.01e | Dependencies | D4 | blueprint, compiler, generators, target-effect, cli | `Blueprint.dependency`, `step.dependency`, implementations per host plus `world`, `add dependency`, `uses-dependency` edges. | acme's `invitation.send` calls a project dependency `Mail` whose `world` implementation records each message as a fact; a journey checks one message per invitation; `architect impact` after changing `Mail.send`'s payload names `invitation.send`. |
| L3.01f | Inbound | L3.01e | blueprint, compiler, generators, target-effect, prove | `Blueprint.inbound.http`, `verify.hmac`, `moves`; `add inbound`. | A fixture webhook signed with the world's secret makes its move and emits its event in a journey; a bad signature is a 401 with no event; the route exists only in `generated/server`. |
| L3.01g | Kits | L3.01d, L3.01e, L3.01f | blueprint, compiler, generators, cli, prove, lint | `Blueprint.kit`, `Blueprint.use` (choices, `choose`, narrow, omit), the `kits/` place, names and prefixes, clash checks, kit secrets and choices, `from-kit` edges, kit journeys in the app's worlds, the export map and closure lint, the generated-import rule amended, and `architect add kit` (2.7) with its `choose` inserts. | A fixture kit is added with one command (`architect add kit ./fixtures/kit-notes`); its operations appear in the generated SDK; mounted a second time as `blueprint/kits/more-notes.ts` they appear as `more-notes-note.*`; a clash fails `check` naming both files; its journeys run and are filed under the mount; `architect impact` after a kit upgrade names the app operation that uses its dependency; the SDK bundle's closure has no kit runtime entry. |
| L3.01h ∥ | Kit generators and views | L3.01g | cli | `architect new kit`, `model --graph`, the `README` and `example/` scaffold. | `architect new kit demo && cd demo && architect prove --env local` is green; `architect model --graph` prints Mermaid with `from-kit` edges for acme. |
| L3.03 | The auth kit, plus SIWE's server half | L3.01g | kit-auth, host-cloudflare, examples/acme | Today's adapter (`config.auth`, `AuthD1`) moved into `kit-auth` with no change to behaviour; acme mounts it; `api-key.create` stays acme's, over `Accounts`. | Every acme journey passes unchanged with `config.auth` deleted; `architect model --surfaces` shows `session.sign-in` on sdk and cli. |
| L3.02 | The wallets kit | L3.01d, L3.03 | kit-wallets | The kit of 3.3: `Signer` with `node` (encrypted keystore) and `world` (test keys), the eight operations, SIWE from the spike, its three journeys. | `acme wallet create && acme wallet list` shows the address; `acme wallet link` links it and `acme session show` lists it; the kit's journeys pass in acme, including an agent refused on `challenge` and absent from MCP. In every world, each test person has a wallet. |
| L3.04 to L3.09 | Chain, Anvil bench, relayer, simulation, follower, 7702 | as today, with L3.01g for L3.04 | kit-chain, host-cloudflare, prove | As in the build plan, delivered as `kit-chain`: dependencies (`Chain`, contract clients, `simulate`) and runtime pieces (relayer and follower actors); the follower feeds `Blueprint.inbound.chain`. | As in the build plan. |
| L3.10 | **Gate 3** | L3.02 to L3.08 | e2e | acme adds the `wallets` and `chain` kits. | `nx run e2e:layer3`: as today, plus: `architect model --surfaces --env production` shows `wallet.create` on sdk and cli only; an agent token is refused on `wallet.complete` over HTTP and MCP; and, if Q1 keeps it in stage 4, `nx run e2e:create` passes. |

**Critical path:** D4 → L3.01a → L3.01b → L3.01d (after S-RC) → L3.01g → L3.03 → L3.02 → Gate 3, with L3.04 → L3.08
after L3.01g. **In parallel:** L3.01c (generators) from the start; S-RC and L3.01e from the start; L3.01f after
L3.01e; L3.01h and the chain lane after L3.01g.

Payments and email are not stage-4 work. They were the test cases of section 3.3, and stay as a sketch
(`spikes/kits-dx/acme/`) until question Q3 is answered; they go in `design/later.md`.

## 6. What this changes elsewhere

To be folded in by the conductor, who owns these files, when stage 4 starts (this pull request adds only its own files,
so as not to cross the layer-3 work under way):

- `design/build-plan.md`: D4 marked decided by this record; layer 3's rows from section 5; W3 needs L3.01e.
- `design/decisions.md`, layer 3: "dependency" and "inbound" (no longer "edge"); kits are packages `kit-<name>`,
  with dependencies, inbound and runtime pieces; `via`.
- `AGENTS.md`: the generated-import rule amended (3.4).
- `design/later.md`: payments and email kits, pending Q3; `actor` as a fourth `runs`.
- acme: journeys move to `blueprint/journeys/` when next touched.

## 7. Open risks

1. Whether Better Auth 1.7.15's `databaseHooks.session.create.before` sees the device-token path. Fallback named in
   1.3 (mark the row in `AuthD1.handle`). L3.01a's check proves which.
2. Minting an agent token in a world: the JWT plugin must sign one the provider's own check accepts (`oauth.ts:47-48`
   verifies issuer and audience against the same keys). If it doesn't, the world runs the real OAuth dance with a
   registered loopback client, as the `mcp-oauth` spike did.
3. Browser signers (passkey, an injected wallet) cannot be proved in Node; the kit's CI needs a real browser. Not on
   Gate 3's path (the CLI uses the `node` keystore).
4. Conditional exports (`browser` / `node`) for client operations were not in the exports spike. S-RC answers it.
5. Payments' and email's world implementations (`stripe-mock`, a local mail sink) are extra local processes, like
   Anvil; they need L3.05's process ownership. Not stage 4.
6. Narrowing is provable only because it is limited to `via` and `omit`. An app that wants a kit operation decided by
   its own role must wrap a dependency (3.3, change 1); if that proves heavy in practice, revisit with evidence.

## 8. Questions only Aaron can answer

Shared terms for this round. **Stage 4**: the run that ends at Gate 3, "acme adds the wallets and chain kits". **A
generator**: a command that writes files for you (`pnpm create architect`, `architect add …`). **Scope**: the first part
of an npm package name, `@architect` in `@architect/blueprint`. **A world implementation**: the real local stand-in a
kit uses in local and test worlds (Anvil for a chain).

## Q1 — Do the builder's generators ship in stage 4, or after Gate 3?

**The problem, in code.** Today a project starts from the Nx preset (`npx create-nx-workspace acme
--preset=@architect/preset`, L1.50), but there is no `pnpm create architect`, no `add environment`, no `check --ready`,
and `add` knows four kinds and no flags:

```ts
// packages/cli/src/modules/add/types.ts:11 (origin/layer/3)
export type What = "thing" | "operation" | "read" | "journey";
```

Gate 3's check is about kits (`acme wallet create`, nonces, a reorg). The generators in section 5's L3.01c are about
the builder's first hour. They don't block the kit steps and run in their own lane, but they are one more step of
review and one more e2e suite on the way to Gate 3.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Gate 3 (L3.10) | adds `nx run e2e:create` to the gate, or not |
| `spikes/kits-dx/tutorial.html` | steps 1, 2, 3, 4 and 9 stay "proposed" until L3.01c lands |
| The conductor's lanes | one more builder lane during stage 4 |
| Aaron's demo of Architect | "create a project and it proves" is minute one of any demo |

**The options**

**Today** (`origin/layer/3`):

```bash
npx create-nx-workspace acme --preset=@architect/preset   # the starter, 5 journeys green
architect add thing allowance                             # then every move, event and environment by hand
```

**A · In stage 4, as its own lane (recommended):**

```bash
pnpm create architect acme      # proves green in under a minute
architect add operation allowance.spend --from active --to active,exhausted
architect check --ready
```

**B · After Gate 3, as stage 4b:**

```bash
# stage 4 ends with kits only; the same commands land in a short stage between Gate 3 and D5
```

**C · Only `add kit` and `new kit` in stage 4; the rest later:**

```bash
architect add kit @architect/kit-wallets   # in stage 4 (L3.01's own check needs it)
pnpm create architect acme                 # later
```

**You do X → what happens**

| Scenario | A · in stage 4 | B · after Gate 3 | C · kit generators only |
|---|---|---|---|
| You try Architect the day Gate 3 passes | `pnpm create architect`, then flags write moves and environments | the Nx preset, then moves, events and environments by hand | the same as B |
| Stage 4's end date | about one builder-step later, in parallel | unchanged | unchanged |
| The tutorial page | all of steps 1 to 10 true | steps 1 to 4 and 9 still proposed | steps 1 to 4 and 9 still proposed |
| Risk to the kit steps | none: separate files (cli `add`, a new package) | none | none |

**Rubric**

| Axis | A · in stage 4 | B · after Gate 3 | C · kit generators only |
|---|---|---|---|
| Floor-first | ✅ the real first hour ships with the gate | ⚠️ a promise | ⚠️ half |
| Reversibility | ✅ can drop from the gate if it slips | ✅ | ✅ |
| Blast radius | ✅ `cli/add`, one new package | ✅ | ✅ |
| Correctness | ✅ e2e from Verdaccio | ✅ | ✅ |
| Parallelizability | ✅ its own lane from day one | ✅ | ✅ |
| Fit | ✅ the tutorial you asked for, true end to end | ⚠️ | ⚠️ |

**Recommendation: A.** It costs no time on the critical path and makes the tutorial true when the gate passes.

## Q2 — Which npm scope do Architect and its kits publish under?

**The problem, in code.** Every package is `@architect/*` (`examples/acme/package.json:7`: `"@architect/blueprint":
"workspace:*"`), and so far they only go to the local Verdaccio. On the public registry the scope belongs to another
project:

```bash
$ npm view @architect/architect name description
name = '@architect/architect'
description = 'Create, deploy, and maintain next-generation AWS cloud function-based serverless infrastructure …'
$ npm view create-architect name
npm error 404 Not Found - GET https://registry.npmjs.org/create-architect
```

Kits make this concrete: a third party's kit names ours in its `needs`, and `architect add kit <package>` writes the
name into every app.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Every package in `packages/` and every kit | their names |
| Every generated project (`package.json`, imports in `blueprint/`) | the name is written into user code |
| `create-architect` | free today; claiming it is outward-facing |
| Layer 2's publish (Verdaccio only so far) | nothing breaks until the first public publish |

**The options**

**Today:**

```ts
import { Blueprint } from "@architect/blueprint";   // resolves only from the workspace or Verdaccio
```

**A · Keep `@architect/*` for local and Verdaccio, decide before the first public publish (recommended):**

```ts
import wallets from "@architect/kit-wallets";        // a rename later is one codemod across packages and generators
```

**B · A scope you own, now:**

```ts
import wallets from "@<your-scope>/architect-kit-wallets";
```

**C · Unscoped names:**

```ts
import wallets from "architect-kit-wallets";        // first come, first served on npm
```

**You do X → what happens**

| Scenario | A · decide later | B · own scope now | C · unscoped |
|---|---|---|---|
| Stage 4 builds and proves | ✅ unchanged | ✅ after a rename pass | ✅ after a rename pass |
| First public publish | must rename first | ✅ | ⚠️ each name may be taken |
| A third party publishes a kit | can't name ours publicly yet | ✅ | ✅ |
| Cost now | none | a rename across packages and generators | the same |

**Rubric**

| Axis | A · decide later | B · own scope now | C · unscoped |
|---|---|---|---|
| Floor-first | ✅ nothing waits | ⚠️ a rename before stage 4 | ⚠️ the same |
| Reversibility | ✅ | ✅ | ⚠️ squatting risk |
| Blast radius | ✅ none now | ⚠️ every package | ⚠️ every package |
| Correctness | ⚠️ can't publish publicly as is | ✅ | ⚠️ |
| Fit | ✅ matches layer 2, Verdaccio only | ✅ | ⚠️ |

**Recommendation: A**, with one exception: claim `create-architect` and a scope when you are ready to go public, since
both are outward-facing and yours to do.

## Q3 — Are payments (Stripe) and email (Resend) standard kits?

**The problem, in code.** Both were designed here as tests of what a kit is (section 3.3) and sketched in
`spikes/kits-dx/acme/`. Built for real, each needs a provider account and keys for staging and production, which
AGENTS.md reserves for you ("Never create a cloud credential without Aaron's written yes"). acme has a place waiting
for email today: `invitation.send` records an invitation and sends nothing
(`examples/acme/src/invitation/send.ts:13`).

**What it touches**

| Dependent | Why it cares |
|---|---|
| `design/later.md` | where they wait if not now |
| acme's `invitation.send` | sends a real email, or keeps not sending |
| Your accounts and the $10 a day cap | Stripe and Resend have free tiers; keys are yours to make |
| L5.04's check ("one email, not two") | needs some mail to count |

**The options**

**Today:**

```ts
// examples/acme/src/invitation/send.ts:13 — no email is sent
yield* steps.insert(records.insert(Invitation, { id: invitation, organization, email, invitedBy: principal.person as never }));
```

**A · Email as a standard kit after Gate 3, payments later (recommended):**

```ts
steps: { insert: Blueprint.step.database(), mail: Blueprint.step.dependency(Mail.send) },   // invitation.send, layer 5 at the latest
```

**B · Both as standard kits after Gate 3:**

```ts
import payments from "@architect/kit-payments";   // needs Stripe keys for staging and production
```

**C · Neither; examples only:**

```ts
// spikes/kits-dx/acme/ stays the only place they exist
```

**You do X → what happens**

| Scenario | A · email first | B · both | C · neither |
|---|---|---|---|
| L5.04 proves "one email, not two" | ✅ with the email kit's world mail sink | ✅ | ⚠️ needs a project dependency instead |
| You make provider accounts | one (Resend) | two | none |
| A builder takes payments | writes a project dependency | ✅ a kit | writes a project dependency |

**Rubric**

| Axis | A · email first | B · both | C · neither |
|---|---|---|---|
| Floor-first | ✅ the one acme needs | ⚠️ more than acme needs | ✅ nothing now |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ one kit | ⚠️ two kits, two accounts | ✅ |
| Correctness | ✅ world mail sink locally | ✅ | ✅ |
| Fit | ✅ fills acme's real gap | ⚠️ | ⚠️ leaves the gap |

**Recommendation: A.**

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | The builder's generators: in stage 4 or after Gate 3 | A · in stage 4, its own lane |
| Q2 | The public npm scope | A · keep `@architect` locally, decide before the first public publish |
| Q3 | Payments and email as standard kits | A · email after Gate 3, payments later |

**Answer key.** Say "Q1 A, Q2 A, Q3 A" to take all three recommendations, or name a different letter for any. Nothing in
stage 4 waits on Q2 or Q3; Q1 decides whether L3.01c is in Gate 3's check.
