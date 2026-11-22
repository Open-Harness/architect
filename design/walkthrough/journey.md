# The whole journey: building the Plugged In app with Orthograph

Written 19 November 2026 for Aaron, by the walkthrough thread. The same page, readable: https://claude.ai/artifact/KqnRPLA3jPbTaVJNAq6jDe. Every command below was run on `origin/m1` at
`6419d4b7`, unless its badge says otherwise.

## Before we start

This is the developer's story, told in order. You spawn an app. You declare its state. You generate everything. You
fill the handlers. You prove it, run it, and deploy it. Then you add wallets, then more features.

The app is **Plugged In**: a link-in-bio app. A person claims a handle, like `@aaron`, and puts links on a public page.

Each step carries one of four badges. They are honest.

| Badge | What it means |
|---|---|
| 🟢 **Works today** | I ran it on `origin/m1`. The output below is pasted, not typed. |
| 🟡 **Built but unproved** | The code exists, and its tests may pass, but I did not see it work end to end here. |
| 🔵 **Designed only** | A decision or a milestone row says how it will work. No code yet. The row is cited. |
| 🔴 **Hole** | Nothing is designed. Someone has to decide it. |

**Where the blueprint came from.** Plugged In does not exist on `m1` yet. Its folder, `examples/plugged-in`, is
slice M1.40. Codex wrote a draft of it on the branch `links/stage-1` (pull request 56), under its old name, `links`. I
copied that draft onto `m1` and renamed it as K15 says: the folder, the package `@plugged-in/source` and the command
`plugged-in`. Nothing else changed. The walkthrough spike (pull request 78) did the same thing and got the same result.

One thing to know up front. Codex's draft is **more than stage 1**. It already has people, sessions, organisations,
invitations and API keys, copied from the starter, plus handles and links with their handlers filled in. So the
example you see below is further along than M1.40 asks. Where that matters, I say so.

---

## 1. Spawning the app

### What you'd want to type

```bash
npm create orthograph plugged-in
```

🔵 **Designed only** (M2.09, and the K15 name table). M2.09 says `ortho new` replaces the Nx preset, and the app it
makes *is* Plugged In at stage 1, with auth and handles mounted. That needs M2.07 (organisations as a plugin) and
ST1.07 (Plugged In mounts auth). Neither exists. There is no `ortho new`, `ortho init` or `create-orthograph` package
on `m1` today:

```text
$ ortho --help
SUBCOMMANDS
  model, describe
  dev
  prove
  promote
  add
  check
  generate
  brief
  impact
  version
  publish
  build
  env
  worlds
  telemetry
  watch
```

### What works today

🟢 **Works today, but only inside this repository.** The Nx preset makes a new project. Gate 1's check 1 does exactly
this: it publishes Orthograph's packages to a local registry (Verdaccio, run under Node, no Docker), then runs the
preset. I ran that script with the name `plugged-in`:

```bash
ORTHO_E2E_NAME=plugged-in tools/e2e/starter.sh
```

```text
== build
== pack the starter into the preset
== registry on :4893
== publish
published orthograph
published compiler
published language-effect
published chain-evm
published lint
published portal
published projections
published generators
published host-cloudflare
published logbook
published prove
published cli
published preset

== create-nx-workspace plugged-in --preset=@orthograph/preset
✔ Installing dependencies with pnpm
✔ Successfully created the workspace: plugged-in

== ortho check
blanks left 0
types ✔
rules ✔
drift ✔
ratchets 0
check ✔

== ortho prove --env local
journey an invitation is used once ✔ 3/3 steps
journey an owner makes an api key ✔ 5/5 steps
journey health is up ✔ 1/1 steps
journey invite and accept ✔ 11/11 steps
journey sign up and sign in ✔ 5/5 steps
…
coverage ✔ moves 4/4 · outcomes 4/4 · refusals 2/2 · runtime refusals 9/10
prove ✔
```

**The break.** None of `@orthograph/*` is on npm yet. The handoff says the npm preview comes after Gate M1. So outside
this repository, nobody can spawn an app at all today. The command only works because the script publishes every
package to a registry on your own machine first.

**The second break.** What lands is the *starter*, not Plugged In. You get people, sessions, organisations,
invitations and API keys. You get no handle, no link and no profile. The name `plugged-in` is only the folder's name.

### What lands on disk

```text
plugged-in/
  package.json            "@plugged-in/source", bin "plugged-in": ./generated/cli/src/main.ts
  nx.json  pnpm-workspace.yaml  tsconfig.json  README.md  CLAUDE.md
  apps/  libs/            empty (Nx's own folders)
  blueprint/
    environments/         local.ts  test.ts  staging.ts  production.ts
    starting-worlds/      founded.ts  invited.ts
    things/
      api-key/            thing.ts  verbs/create.ts
      invitation/         thing.ts  machine.ts  events.ts  roles.ts  verbs/{accept,revoke,send}.ts
      membership/         thing.ts  roles.ts  verbs/get.ts
      organization/       thing.ts  machine.ts  events.ts  roles.ts  verbs/{create,get}.ts
      person/             thing.ts  errors.ts  verbs/sign-up.ts
      session/            thing.ts  errors.ts  verbs/{show,sign-in}.ts
      system/             thing.ts  verbs/health.ts
    values/identity.ts
  src/                    one handler per operation, already filled
    api-key/create.ts  invitation/{accept,revoke,send}.ts  organization/create.ts
    person/sign-up.ts  session/{show,sign-in}.ts  system/health.ts
  journeys/               an-invitation-is-used-once.ts  an-owner-makes-an-api-key.ts  health-is-up.ts
                          invite-and-accept.ts  sign-up-and-sign-in.ts
  generated/              api  cli  docs  mcp  model  portal  sdk  server
  .ortho/                 local state: prove's database, traces, evidence (ignored by git)
```

Four folders matter, and they are the same in every Orthograph project:

| Folder | Whose it is | What's in it |
|---|---|---|
| `blueprint/` | yours | what you declare: things, machines, operations, errors, roles, events, environments, starting worlds |
| `src/` | yours | the handlers, one per operation. Scaffolded once, then yours |
| `journeys/` | the journey author's | the stories that prove the app works. The builder never edits them |
| `generated/` | Orthograph's | everything that falls out. Every file says `Do not edit` and is rewritten on each generate |

---

## 2. Declaring state: a thing, its fields, its machine

A **thing** is a noun your app keeps: here a handle, a link and a profile. A thing has **fields**. If it has a
lifecycle, it has a **machine**: its states and the moves between them.

### Make a new thing

🟢 **Works today.** `ortho add thing` writes the five files every thing has, with blanks for you to fill. Here it is
for a made-up `bookmark`, dry run:

```text
$ ortho add thing bookmark --dry-run
--- blueprint/things/bookmark/thing.ts
import { Blueprint } from "orthograph";

export const Bookmark = Blueprint.thing({
  description: Blueprint.todo("what a bookmark is, in one sentence"),
  fields: {
    id: Blueprint.id("boo"),
  },
});
--- blueprint/things/bookmark/machine.ts
import { Blueprint } from "orthograph";
import { Bookmark } from "./thing.ts";

// The states a bookmark can be in, and the moves between them. Each move names the event it emits (events.ts).
export const machine = Blueprint.machine(Bookmark, {
  states: Blueprint.todo("the states a bookmark can be in, the first one where it starts"),
  moves: {},
  notFrom: { exit: 40 }, // the exit code when a move can't start from the state it's in
});
--- blueprint/things/bookmark/roles.ts
import { Blueprint } from "orthograph";
import { Bookmark } from "./thing.ts";

// Who a person is to a bookmark. Rename the role to what it means.
export const holder = Blueprint.role(Bookmark, { rule: Blueprint.todo("when a person holds this role on a bookmark") });
--- blueprint/things/bookmark/events.ts
// What happened to a bookmark, one event per move: `export const BookmarkMade = Blueprint.event({ ... })`.
export {};
--- blueprint/things/bookmark/errors.ts
// Refusals that depend on data: `export class BookmarkMissing extends Blueprint.error({ ... }, { exit: 40 }) {}`.
// The machine's own refusal is generated and never written here.
export {};
--- blueprint/values/bookmark.ts
// The values a bookmark's fields are made of: `export const Amount = Blueprint.value(Blueprint.uint(128))`.
export {};
(dry run: 6 files, nothing written)
```

Each `Blueprint.todo` is a blank. `ortho check` lists every blank with its file and line, and fails until they're
filled. Asking for a thing that already exists writes nothing:

```text
$ ortho add thing link --dry-run
already there, so nothing was written: blueprint/things/link/thing.ts, blueprint/things/link/machine.ts, blueprint/things/link/roles.ts, blueprint/things/link/events.ts, blueprint/things/link/errors.ts
(exit 2)
```

### The values

🟢 **Works today.** A value is a field's type, with its rules. Plugged In's are in one file. A handle name is lower
case, starts with a letter, and is at most 32 long. A link's address must be http or https and must parse.

`blueprint/values/links.ts`:

```ts
import { Blueprint, Schema } from "orthograph";

export const HandleName = Blueprint.value(Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]{0,31}$/)));
export const LinkTitle = Blueprint.value(Blueprint.text({ max: 120 }));
export const LinkUrl = Blueprint.value(Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.isPattern(/^https?:\/\//),
  Schema.makeFilter((url: string) => URL.canParse(url)),
));
export const LinkPosition = Blueprint.value(Blueprint.uint(32));
```

### The thing: a handle

🟢 **Works today.** `blueprint/things/handle/thing.ts`:

```ts
import { Blueprint } from "orthograph";
import { HandleName } from "../../values/links.ts";
import { Person } from "../person/thing.ts";

export const Handle = Blueprint.thing({
  description: "A public name that belongs to one person until they release it.",
  code: "HN",
  fields: { id: Blueprint.id("hdl"), name: HandleName, owner: Person.fields.id },
});
```

`code: "HN"` is the prefix of every refusal code this thing gives: `HN-001`, `HN-002`. `Blueprint.id("hdl")` makes ids
like `hdl_aaron`. `owner` points at a person's id, so the model knows a handle belongs to a person.

### Its machine

🟢 **Works today.** `blueprint/things/handle/machine.ts`:

```ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { HandleClaimed, HandleReleased } from "./events.ts";

export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: {
    claim: { from: [], to: "claimed", emits: HandleClaimed },
    release: { from: ["claimed"], to: "released", emits: HandleReleased },
  },
  notFrom: { exit: 5 },
});
```

Two states, two moves. `claim` has no `from`, so it creates a handle. `release` only works from `claimed`. If you try
to release a handle that's already released, the runtime refuses before your code runs, with exit 5. You never write
that check.

The link has the same shape: `listed` and `removed`, with `add` and `remove`. The profile has no machine at all; it's
plain data with a `status` field.

### See what the compiler understood

🟢 **Works today.** `ortho model` (also called `ortho describe`) prints what the compiler read. Each line ends in a
hash. Change a declaration and only its hash moves; that is how Orthograph knows what a change makes stale.

```text
$ ortho model
thing api-key  dec54cf75bd4acb9
thing handle (claimed, released)  91455fb8cfa33c84
thing invitation (pending, accepted, revoked)  7c1d13c393ddaa62
thing link (listed, removed)  3a2c26b144fefb8c
thing membership  e6505be81a7030e4
thing organization (active)  24a71fadb70bce98
thing person  ad771ebabdfe3e0e
thing profile  4918b89e1968d655
thing session  455311c2adae1097
thing system  357767c64efceced
operation api-key.create  refuses NotAllowed  56de0903f4a0f20e
operation handle.claim  refuses HandleTaken, HandleAlreadyOwned, NotAllowed  5040bd430a847bbe
operation handle.release  refuses HandleNotClaimed, NotAllowed  94a4caf880c12e77
operation handle.resolve  refuses HandleNotFound  ad4b5e61f0e03361
operation invitation.accept  refuses InvitationNotPending, NotAllowed  937e15a8f2c9b98a
operation invitation.revoke  refuses InvitationNotPending, NotAllowed  a527002466da0300
operation invitation.send  refuses NotAllowed  2f3b2483d2c752f7
operation link.add  refuses LinkNeedsHandle, NotAllowed  87b4ac441f731c56
operation link.order  refuses LinkAlreadyRemoved, NotAllowed  fc4cb5a4800763c8
operation link.remove  refuses LinkNotListed, NotAllowed  8dbeeeecbb3d2365
operation membership.get  refuses NotAllowed  681858c8967f5976
operation organization.create  refuses NotAllowed  c85baf957d5baae5
operation organization.get  refuses NotAllowed  fa554aa19547e5b1
operation person.sign-up  refuses PersonEmailTaken  e11e9d899807519a
operation profile.get  refuses ProfileNotFound  4a947f542dc7ad93
operation session.show  refuses NotAllowed  4c1f11c0f00cc6e0
operation session.sign-in  refuses SessionCredentialsWrong  64fc31973ed9c65e
operation system.health  refuses nothing  7e17e7bd40ff6ca9
```

### Where it breaks

🔵 **Designed only: a field can't have a description.** A thing has a description; its fields don't. There is no
place in `Blueprint.thing` to say what `owner` means. The K14 grid found this (`FieldModel` has no description), and
M1.41's check expects field descriptions in every output, so M1.42 must add it. K14 proposes the row; it is not in
`milestones.md` yet.

🟡 **Built but unproved: field visibility.** You can mark a value secret today. Plugged In's password and session
token are, in `blueprint/values/identity.ts`:

```ts
export const Password = Blueprint.visibility.secret(Blueprint.text({ max: 128 }));
export const Secret = Blueprint.visibility.secret(Blueprint.text({ max: 512 }));
```

The runtime keeps these out of the journal and telemetry. But the **one rule** that every output obeys, for every kind
of caller, is M1.35. Its check (check 16) is merged on `m1` and is red: no `Audience` exists yet, and through a
handler that adds fields, the HTTP answer, the SDK and the CLI show every caller a secret. 🔵 That rule is
**designed only** (M1.35). The portal can't show a field's visibility either (M1.42).

---

## 3. Operations, errors, roles and events

An **operation** is something a caller can do: claim a handle, add a link. A **read** is an operation that changes
nothing. An **error** is a refusal you declare. A **role** says who a person is to a thing. An **event** is the record
a move leaves behind.

### The operation: claim a handle

🟢 **Works today.** `blueprint/things/handle/verbs/claim.ts`. The file's path is its name: `handle.claim`.

```ts
import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { HandleTaken, HandleAlreadyOwned } from "../errors.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Handle, {
  description: "Claim a free name and make it the address of your public profile.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  errors: [HandleTaken, HandleAlreadyOwned],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
```

Read it top to bottom. It takes a name. It answers a handle id. It makes the `claim` move. It can refuse in two
declared ways. Anyone signed in may call it. It has two steps, each a database call, each its own span in the trace.
The same request sent twice is one call. And it should answer within 150 milliseconds, 95 times in 100.

A read looks the same without a move. `blueprint/things/profile/verbs/get.ts` lets anyone read a page:

```ts
import { Blueprint, Schema } from "orthograph";
import { Profile } from "../thing.ts";
import { ProfileNotFound } from "../errors.ts";
import { Handle } from "../../handle/thing.ts";
import { Link } from "../../link/thing.ts";

const PageLinks = Blueprint.value(Schema.Array(Schema.Struct({
  id: Link.fields.id.value.schema,
  title: Link.fields.title.value.schema,
  url: Link.fields.url.value.schema,
})));

export default Blueprint.operation(Profile, {
  description: "Read a claimed name's public profile and its links in display order.",
  payload: { handle: Handle.fields.name },
  answer: { handle: Handle.fields.name, links: PageLinks },
  errors: [ProfileNotFound],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
```

### The errors

🟢 **Works today.** `blueprint/things/handle/errors.ts`. Each class is a refusal with its exit code. The refusal code
(`HN-001`) is given by the compiler, in the order they're declared.

```ts
import { Blueprint } from "orthograph";

export class HandleTaken extends Blueprint.error({}, { exit: 3 }) {}
export class HandleAlreadyOwned extends Blueprint.error({}, { exit: 4 }) {}
export class HandleNotFound extends Blueprint.error({}, { exit: 6 }) {}
```

### The role

🟢 **Works today.** `blueprint/things/handle/roles.ts`. The owner of a handle is the person in its `owner` field.

```ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const handleOwner = Blueprint.role(Handle, { rule: (handle, caller) => handle.owner === caller.person });
```

`handle.release` says `allowed: [handleOwner]`. The runtime checks the rule before the handler runs. A stranger gets
`NotAllowed` and your code never sees the call.

### The events

🟢 **Works today.** `blueprint/things/handle/events.ts`. The machine names which event each move emits. The runtime
writes it to the journal in the same commit as the change.

```ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
export const HandleReleased = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
```

### Check it all

🟢 **Works today.**

```text
$ ortho check
blanks left 0
types ✔
rules ✔
drift ✔
ratchets 0
check ✔
```

### Where it breaks

🔴 **Hole: two refusals can share an exit code.** `HandleTaken` is declared with exit 3. The runtime's `NotAllowed`
is also exit 3. So a script calling `plugged-in handle claim` can't tell "that name is taken" from "you aren't signed
in" by exit code. I ran both (chapter 7 shows it): both exit 3. The compiler doesn't refuse the clash, and the
portal's agreed design (`design/portal.md:141`) even draws `HN-001 exit 3` beside `HN-002 exit 3`. K16's M1.47 makes
one refusals table for every surface, but it doesn't forbid two refusals of one operation sharing an exit. Someone
has to decide: refuse the clash at compile time, or reserve exits 1 to 9 for the runtime.

🔵 **Designed only: who may call isn't in the clients.** `allowed` reaches the docs and the server, but not the SDK,
the CLI's help or MCP (K17, "Declared, reaching nothing"; K14). Designed in M1.42 and M2.03.

🔵 **Designed only: a declared refusal isn't typed in the SDK.** The walkthrough spike traced `HandleTaken` and found
it reaches the API, docs, portal, model and scaffold, but not the SDK, CLI or MCP as a type. M1.12 (the SDK contract)
designs it.

🔵 **Designed only: a refusal's fields.** All of Plugged In's errors carry no fields (`Blueprint.error({}, …)`). They
could. K16 gives each field its own blank in the scaffold (M1.44).

---

## 4. `ortho generate`: what falls out

You've declared the state and the operations. Now one command makes everything else.

🟢 **Works today.** On a clean copy, with no `generated/` folder:

```text
$ ortho generate
created generated/model/model.json
created generated/model/edges.json
created generated/server/main.ts
created generated/server/wrangler.jsonc
created generated/server/migrations/0001_things.sql
created generated/portal/blueprint.json
created generated/portal/main.ts
created generated/mcp/src/index.ts
created generated/api/src/…            (54 files)
created generated/docs/…               (28 files)
created generated/sdk/src/…            (21 files)
created generated/cli/src/…            (21 files)
```

That is 124 files and 11,159 lines, in about a second. Run it again and it says `nothing to change`. If an operation
has no handler yet, the same command writes one into `src/`, once (chapter 5).

Here is what falls out for one operation, `handle.claim`. These are whole files.

### The API

`generated/api/src/handle/claim.ts`. One endpoint, its payload and answer from the declaration, its three refusals,
and its two step names:

```ts
// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/handle/verbs/claim.ts";
import { HandleTaken, HandleAlreadyOwned, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("claim", "/handle/claim", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [HandleTaken, HandleAlreadyOwned, NotAllowed],
});
export const steps = ["handle.claim.load", "handle.claim.record"] as const;
```

`generated/api/src/handle/claim.handler.ts`, the type your handler must fit:

```ts
// Generated from the blueprint. Do not edit.
// What the handler is given: its payload and steps; what it may return: its answer or a declared error.
import type { SqlClient } from "effect/sql";
import type { Auth, Handler as Of, Records } from "@orthograph/language-effect";
import type declaration from "../../../../blueprint/things/handle/verbs/claim.ts";

export type Handler<R = Records | SqlClient.SqlClient | Auth> = Of<typeof declaration, R>;
```

### The server

`generated/server/main.ts` (273 lines) is one Cloudflare Worker. Each route runs its handler inside the runtime's
wrapper. It also serves the portal at `/portal`, MCP at `/mcp`, sign-in at `/api/auth/`, and the test world at
`/_world/`. Its fetch handler, whole:

```ts
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.
    if (new URL(request.url).pathname.startsWith("/_world/") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), leases: env.ORTHO_WORLDS === "1" }, request);
    }
    if (new URL(request.url).pathname === "/_ortho/bundle") {
      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256
        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))
        : Promise.resolve(Response.json({ _tag: "NotAnEnvironment" }, { status: 404 }));
    }
    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);
    if (new URL(request.url).pathname.startsWith("/api/auth/")) return Effect.runPromise(AuthD1.handle(routesOf(env), request));
    if (new URL(request.url).pathname.startsWith("/.well-known/")) {
      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: "not found" }, { status: 404 }));
    }
    if (new URL(request.url).pathname === "/mcp") {
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "plugged-in", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "plugged-in", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
```

The database tables come out too. `generated/server/migrations/0001_things.sql`, the handle's and the link's tables
and the two the runtime keeps:

```sql
-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
CREATE TABLE "handle" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "link" (
  "id" TEXT PRIMARY KEY,
  "owner" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
-- Every event a move emitted, with the trace of the call that made it (language-effect's Journal).
CREATE TABLE "_journal" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "trace" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "move" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fields" TEXT NOT NULL
);
CREATE INDEX "_journal_trace" ON "_journal" ("trace");
-- Each idempotent call's answer, under its operation, caller and request key, committed with the call itself.
CREATE TABLE "_requests" (
  "key" TEXT PRIMARY KEY,
  "answer" TEXT NOT NULL
);
```

(The file has all ten things' tables; I cut eight of them here.)

### The SDK

`generated/sdk/src/handle/claim.ts`. The client is named after the app: `PluggedIn`.

```ts
// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/claim.ts";
import { PluggedIn } from "../client.ts";

/** Claim a free name and make it the address of your public profile. */
export const claim = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(PluggedIn, (client) => client.handle.claim({ payload }));
```

### The CLI

`generated/cli/src/handle/claim.ts`. One command per operation, one flag per payload field:

```ts
// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/handle/claim.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Claim a free name and make it the address of your public profile. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const claim = Command.make(
  "claim",
  { name: Flag.String("name"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.handle.claim), Output.answer(json)),
);
```

### MCP

`generated/mcp/src/index.ts`. One tool per operation, named as the operation is. The handle's three lines:

```ts
  "handle.claim": { description: "Claim a free name and make it the address of your public profile.", operation: handleClaim },
  "handle.release": { description: "Free your name and take its public profile offline.", operation: handleRelease },
  "handle.resolve": { description: "Find the handle for a claimed name.", operation: handleResolve },
```

### The docs

`generated/docs/handle/claim.md`, whole:

````markdown
<!-- Generated from the blueprint. Do not edit. -->
# handle.claim

Claim a free name and make it the address of your public profile.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| name | handle.name |

## Answer

| field | value |
|---|---|
| handle | handle.id |

## Move

`claim`: from nothing (it creates) to claimed, emitting HandleClaimed.

## Steps

- `handle.claim.load` (database)
- `handle.claim.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleTaken | 3 | HN-001 | declared in errors.ts |
| HandleAlreadyOwned | 4 | HN-002 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
plugged-in handle claim --name <name>
```

HTTP: `POST /handle/claim` with the payload as JSON. SDK: `Sdk.handle.claim(payload)`.
````

### The portal and the model

`generated/portal/blueprint.json` (4,264 lines) is the portal's data: the model, the docs, and a digest. Its top keys
are `schemaVersion, project, revision, model, dependsOnByOperation, docs, extensions, digest`, and the model inside
holds `refusals, values, things, operations, journeys, startingWorlds, environments`. `generated/model/model.json` is
the compiler's model itself.

### Where it breaks

🔵 **Designed only: the SDK has no types for things or events.** `generated/sdk/src/index.ts` exports the client,
the layer and the errors, and nothing else. You can't write `PluggedIn.Handle` in your app. M1.42.

```ts
// Generated from the blueprint. Do not edit.
export { PluggedIn, layer } from "./client.ts";
export { Errors } from "../../api/src/index.ts";
export * as apiKey from "./api-key/index.ts";
export * as handle from "./handle/index.ts";
…
```

🔵 **Designed only: the CLI's help is empty.** Every flag is text, and the help says nothing about the field. M1.42.

```text
$ plugged-in handle claim --help
USAGE
  plugged-in handle claim [flags]

FLAGS
  --name string
  --json
```

🔵 **Designed only: the budget reaches no code.** `p95 150ms` reaches the docs, the portal data and the model. It
doesn't reach the runtime or the spans. The walkthrough spike traced it. M1.36 counts budget breaches (its check,
check 17, is red).

🔵 **Designed only: the SDK sends no request key.** The docs say "send `idempotency-key`", and the server honours it.
But the generated SDK and CLI never send one, so a retried CLI call is two calls. M1.12 (check 14 is red).

🔵 **Designed only: sdk, cli and mcp as mounted plugins.** Model, API and server are already mounted plugins
(M1.11). The SDK, CLI, MCP, docs and portal are still a fixed list in the generator. M3.22 moves them (K13).

---

## 5. Filling the handler scaffold

A **handler** is your code for one operation. It goes in `src/`. Orthograph writes the first version, the
**scaffold**, and from then on it's yours.

### Today's scaffold

🟢 **Works today.** I moved `src/handle/claim.ts` aside and generated:

```text
$ ortho generate
created src/handle/claim.ts (scaffold: yours from now on)
```

`src/handle/claim.ts`, as it lands:

```ts
// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";

const { HandleTaken, HandleAlreadyOwned } = Errors.declared;

/** Claim a free name and make it the address of your public profile. */
const claim: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.load(Handlers.blank("load: the work this step does"));
    yield* steps.record(Handlers.blank("record: the work this step does"));
    if (yield* Handlers.blank<boolean>("refuse HandleTaken when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleTaken was refused"));
      return yield* new HandleTaken(yield* Handlers.blank("HandleTaken's fields"));
    }
    if (yield* Handlers.blank<boolean>("refuse HandleAlreadyOwned when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleAlreadyOwned was refused"));
      return yield* new HandleAlreadyOwned(yield* Handlers.blank("HandleAlreadyOwned's fields"));
    }
    yield* move();
    return yield* Handlers.blank("the answer");
  });

export default claim;
```

It compiles. Each `Handlers.blank` is a hole; `ortho prove` names the one it reaches (chapter 6). Every step is
already wired, in order, and every declared refusal has its block.

**The break.** Look at the order. The scaffold puts both refusals *after* `record`, the step that writes. Filled in as
laid out, you'd write the handle and *then* refuse because it was taken. K16 fixes this: refusals go before the first
step that writes.

**Another break.** The header is one line: the description. It doesn't say who may call, what each refusal's exit
code is, or what the machine looks like.

### Ask Orthograph what to do

🟢 **Works today.** `ortho brief` writes a builder's brief for one operation. It's what you'd hand an agent:

```text
$ ortho brief handle.claim
brief handle.claim

Write   src/handle/claim.ts, and nothing else.

Read
  blueprint/things/handle/verbs/claim.ts  the declaration: payload, answer, move, steps, errors
  generated/api/src/handle/claim.handler.ts  what the handler is given and may return
  generated/docs/handle/claim.md  the same, in words, with every refusal
  generated/docs/handle/index.md  the handle: fields, machine, roles

Do
  run step handle.claim.load (database) through steps.load(...)
  run step handle.claim.record (database) through steps.record(...)
  make the move with move(): claim, emitting HandleClaimed
  refuse with HandleTaken (exit 3), HandleAlreadyOwned (exit 4), each after an Effect.logInfo saying why
  never refuse NotAllowed yourself: the runtime does, before the handler runs

Don't touch
  blueprint/**
  blueprint/journeys/**
  blueprint/starting-worlds/**
  journeys/**
  generated/**
  test/**

Done when
  ortho prove --env local passes, with handle.claim's 9 evals: answer shape, declared errors, machine path, events, who may call, steps, performance, coverage, explainability
  and the journeys that call it: journeys/a-name-is-claimed-once.ts, journeys/claim-a-public-page.ts
  ortho check passes
```

### The filled handler

🟢 **Works today.** Codex filled it on `links/stage-1`. `src/handle/claim.ts`, whole:

```ts
// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";
import { HandleAlreadyOwned, HandleTaken } from "../../blueprint/things/handle/errors.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { PageRecords } from "#modules/page/service.js";

const claim: Handler = ({ name }, { principal, steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const owner = yield* PageRecords.signedInPerson(principal);
    const handle = yield* PageRecords.handleId(name);
    const profile = yield* PageRecords.profileId(owner);
    const [named, page] = yield* steps.load(Effect.all([PageRecords.find(Handle, handle), PageRecords.find(Profile, profile)]));
    if (named?.state === "claimed") {
      yield* Effect.logInfo("the name has already been claimed");
      return yield* new HandleTaken({});
    }
    if (page?.status === "active") {
      yield* Effect.logInfo("the person already has a claimed name");
      return yield* new HandleAlreadyOwned({});
    }

    yield* steps.record(Effect.gen(function* () {
      if (named) yield* records.update(Handle, handle, { owner });
      else yield* records.insert(Handle, { id: handle, name, owner });

      if (page) yield* records.update(Profile, profile, { handle, status: "active" });
      else yield* records.insert(Profile, { id: profile, handle, owner, status: "active", links: [] });
    }));
    yield* move();
    return { handle };
  });

export default claim;
```

The handler reads, refuses, writes, moves and answers. It never checks who's calling, never writes the event, never
commits. The runtime does those. Note it makes the profile too, in the same commit: K9 wants that to be a reaction
to `HandleClaimed` (M3.08), which doesn't exist yet.

### What K16 makes it

🔵 **Designed only** (K16, pull request 75, not merged; slices M1.44 to M1.48; checks in pull request 76, red by
design). K16's worked example is acme's `allowance.spend`; there is no Plugged In one. So I applied K16's rules to
`handle.claim` by hand. **This file is drawn, not generated.**

```ts
// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";

const { HandleTaken, HandleAlreadyOwned } = Errors.declared;

/**
 * handle.claim: Claim a free name and make it the address of your public profile.
 *
 * Who may call, from blueprint/things/handle/verbs/claim.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/handle/verbs/claim.ts:
 *   name  handle.name
 *
 * Answer, from blueprint/things/handle/verbs/claim.ts:
 *   handle  handle.id
 *
 * Refusals:
 *   HandleTaken         exit 3  HN-001  yours to refuse below; from blueprint/things/handle/errors.ts
 *   HandleAlreadyOwned  exit 4  HN-002  yours to refuse below; from blueprint/things/handle/errors.ts
 *   NotAllowed          exit 3  AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/handle/verbs/claim.ts
 *
 * Idempotent by request, from blueprint/things/handle/verbs/claim.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/handle/verbs/claim.ts: p95 150ms.
 *
 * The handle's machine, from blueprint/things/handle/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  claim    claimed   HandleClaimed
 *     claimed    release  released  HandleReleased
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it hands in the id it mints for the new handle;
 *   each step is its own span: handle.claim.load, handle.claim.record;
 *   once it answers, it sets the handle's state to claimed;
 *   once it answers, it writes HandleClaimed: name from the payload, handle from the answer;
 *   the call is the span handle.claim, and its commit handle.claim.commit.
 */
const claim: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span handle.claim.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // HandleTaken: exit 3, HN-001.
    if (yield* Handlers.blank<boolean>("refuse HandleTaken when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleTaken was refused"));
      return yield* new HandleTaken({});
    }

    // HandleAlreadyOwned: exit 4, HN-002.
    if (yield* Handlers.blank<boolean>("refuse HandleAlreadyOwned when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why HandleAlreadyOwned was refused"));
      return yield* new HandleAlreadyOwned({});
    }

    // Step record: database, span handle.claim.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    // The move claim, from nothing (it creates), to claimed.
    yield* move();

    return {
      // HandleClaimed needs handle, and only the answer can give it.
      handle: yield* Handlers.blank("handle, a handle.id"),
    };
  });

export default claim;
```

`claim` has one ending, so there's no `Match`. `link.remove` would have one too. Only a move with two or more `to`
states gets a `Match` branch per ending, and Plugged In has none yet. The header would also show the clash from
chapter 3 in plain sight: two refusals at exit 3.

---

## 6. Journeys and `ortho prove`

A **journey** is a story told in calls, with what each call must do. Journeys are written by someone other than the
builder, before the handlers, and they fail on empty handlers first.

### A journey

🟢 **Works today.** `journeys/claim-a-public-page.ts`, whole:

```ts
// Journey-author file. The builder never edits it.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { HandleNotFound } from "../blueprint/things/handle/errors.ts";
import { HandleClaimed } from "../blueprint/things/handle/events.ts";
import { machine } from "../blueprint/things/handle/machine.ts";
import claim from "../blueprint/things/handle/verbs/claim.ts";
import resolve from "../blueprint/things/handle/verbs/resolve.ts";
import { LinkNeedsHandle } from "../blueprint/things/link/errors.ts";
import add from "../blueprint/things/link/verbs/add.ts";
import { ProfileNotFound } from "../blueprint/things/profile/errors.ts";
import get from "../blueprint/things/profile/verbs/get.ts";

export default Blueprint.journey("claim a public page", {
  cast: { aaron: Blueprint.signedIn, visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "an unclaimed name does not resolve",
      s.visitor.run(resolve, { name: "firstpage" }),
      refuses(HandleNotFound),
      noEvents(),
    ),
    s.step(
      "an unclaimed name has no public page",
      s.visitor.run(get, { handle: "firstpage" }),
      refuses(ProfileNotFound),
      noEvents(),
    ),
    s.step(
      "adding a link before claiming a name is refused",
      s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
      refuses(LinkNeedsHandle),
      noEvents(),
      spans({ absent: ["link.add.record"] }),
    ),
    s.step(
      "aaron claims his name",
      s.aaron.run(claim, { name: "firstpage" }, { request: "first-claim" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      emits(HandleClaimed, { handle: s.last.handle, name: "firstpage" }),
      machine.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim.load", "handle.claim.record"] }),
    ),
    s.step(
      "an anonymous visitor can read the new page immediately",
      s.visitor.run(get, { handle: "firstpage" }),
      expect((a) => a).toEqual({ handle: "firstpage", links: [] }),
      noEvents(),
    ),
  ],
});
```

Each step checks the answer, the event, the machine's state and the trace. A **starting world** sets the scene for a
journey; `blueprint/starting-worlds/claimed-aaron.ts` starts one with `aaron` already holding his name.

### Prove it on empty handlers

🟢 **Works today.** `ortho prove --empty` swaps every handler for its scaffold and runs the journeys. Every step that
needs real work goes red, naming the blank it hit. A step that passes anyway is "proved by the description": the
blueprint alone made it true.

```text
$ ortho prove --empty
journey claim a public page ✘ 0/5 steps
  ✘ "an unclaimed name does not resolve": BlankReached: load: the work this step does; expected refused with HandleNotFound, failed with 500
  ✘ "an unclaimed name has no public page": BlankReached: load: the work this step does; expected refused with ProfileNotFound, failed with 500
  ✘ "adding a link before claiming a name is refused": BlankReached: load: the work this step does; expected refused with LinkNeedsHandle, failed with 500
  ✘ "aaron claims his name": BlankReached: load: the work this step does; expected an answer, failed with 500; emits: nothing at last.handle; is-in: nothing at last.handle; span handle.claim.record missing
  ✘ "an anonymous visitor can read the new page immediately": BlankReached: load: the work this step does; expected an answer, failed with 500
journey edit a public page ✘ 1/11 steps
  ✘ "a visitor can read the first link and its public fields": BlankReached: load: the work this step does; expected an answer, failed with 500
  …
  ✔ "a stranger cannot remove a link": proved by the description
  …
prove ✘ 48 failing
```

### Prove it for real

🟢 **Works today.** With Codex's handlers in place, all eight journeys pass, and each operation passes nine evals:

```text
$ ortho prove
journey a name is claimed once ✔ 14/14 steps
journey an invitation is used once ✔ 3/3 steps
journey an owner makes an api key ✔ 5/5 steps
journey claim a public page ✔ 5/5 steps
journey edit a public page ✔ 11/11 steps
journey health is up ✔ 1/1 steps
journey invite and accept ✔ 11/11 steps
journey sign up and sign in ✔ 5/5 steps
…
handle.claim answer shape ✔
handle.claim declared errors ✔
handle.claim machine path ✔
handle.claim events ✔
handle.claim who may call ✔
handle.claim steps ✔
handle.claim performance ✔ p50 7ms p95 99ms budget p95 150ms
handle.claim coverage ✔
handle.claim explainability ✔
handle.claim 9 evals ✔ p50 7ms p95 99ms budget p95 150ms
…
coverage ✔ moves 8/8 · outcomes 8/8 · refusals 8/8 · runtime refusals 14/17
prove ✔
```

Prove runs the real Worker on workerd, on this machine, with a fresh local database. No Docker, no cloud.

### Read the trace

🟢 **Works today.** Every call is traced. Prove keeps the traces, and `ortho telemetry trace` prints one:

```text
$ ortho telemetry trace a2e9152a16deca18a000f5fcf9b3134a
trace a2e9152a16deca18a000f5fcf9b3134a  9 spans
journey.a name is claimed once  99 ms
  · Sent HTTP response
  handle.claim  99 ms  move claim → claimed
    sqlite  8.0 ms
    handle.claim.load  54 ms  step database
      · handle.claim.load start
      · handle.claim.load end
      sqlite  17 ms
      sqlite  7.0 ms
    handle.claim.record  1.0 ms  step database
      · handle.claim.record start
      · handle.claim.record end
    handle.claim.commit  16 ms  step commit
      BATCH  10 ms
```

### Change one handler, see what's stale

🟢 **Works today.** I changed one log line in `src/handle/claim.ts`:

```text
$ ortho impact
stale handle.claim
proven api-key.create, handle.release, handle.resolve, invitation.accept, invitation.revoke, invitation.send, link.add, link.order, link.remove, membership.get, organization.create, organization.get, person.sign-up, profile.get, session.show, session.sign-in, system.health
```

### Write a new journey

🟢 **Works today**, as a blank:

```text
$ ortho add journey "a stranger cannot claim for aaron" --dry-run
--- blueprint/journeys/a-stranger-cannot-claim-for-aaron.ts
import { Blueprint } from "orthograph";

export default Blueprint.journey("a stranger cannot claim for aaron", {
  cast: Blueprint.todo("who is in it, by role"),
  steps: () => Blueprint.todo("the steps, each a call and its checks"),
});
(dry run: 1 files, nothing written)
```

### Where it breaks

**A break: `prove --only` judges the whole app.** I ran this. Running one journey still runs every operation's evals, so
everything that journey doesn't touch fails coverage:

```text
$ ortho prove --only "claim a public page"
journey claim a public page ✔ 5/5 steps
api-key.create coverage ✘ api-key.create reached by no journey
api-key.create 1 of 9 evals ✘ no timed calls
…
coverage ✔ moves 1/8 · outcomes 1/8 · refusals 3/8 · runtime refusals 0/17
prove ✘ 16 failing
(exit 1)
```

The journey passed, and the command exits 1. 🔴 **Hole**: nothing says what `--only` should judge. It should probably
judge only the operations the chosen journeys call.

🔵 **Designed only: journey stubs from the machine.** `ortho add journeys handle` would write one stub per path
through the handle's machine, per role and per declared error. K16 section e, slice M1.45.

🔵 **Designed only: journeys through every client.** Prove calls the server over HTTP. It doesn't drive the SDK, the
CLI or MCP. M2.08.

---

## 7. Running it locally and opening the portal

### Start it

🟢 **Works today.**

```text
$ ortho dev --port 8797
running at http://127.0.0.1:8797  (world at http://127.0.0.1:8797/_world, wrangler output in …/.ortho/dev/wrangler.log)
```

That's the generated Worker on workerd, with a fresh local database.

### Use it from the CLI

🟢 **Works today.** The app's own command is `plugged-in`. It talks to `PLUGGED_IN_URL` and signs in with
`PLUGGED_IN_TOKEN`. Plugged In still carries sign-up and sign-in copied from the starter, so I signed up first. The
token is never printed. Without `PLUGGED_IN_URL` the CLI calls the default port, 8787, so point it at the dev server
first.

```text
$ export PLUGGED_IN_URL=http://127.0.0.1:8797
$ plugged-in system health
ok
$ plugged-in person sign-up --email aaron@example.test --password … --name Aaron
per_8ysr5wr3uezfstz7
$ export PLUGGED_IN_TOKEN=$(plugged-in session sign-in --email aaron@example.test --password … --json | jq -r .token)
$ plugged-in handle claim --name aaron
hdl_aaron
$ plugged-in link add --title GitHub --url https://github.com/aaron
lnk_eopd5ztj6hp0ex28
$ plugged-in link add --title Blog --url https://aaron.example
lnk_f769a4hiatmyqg9i
$ plugged-in profile get --handle aaron --json
{"handle":"aaron","links":[{"id":"lnk_eopd5ztj6hp0ex28","title":"GitHub","url":"https://github.com/aaron"},{"id":"lnk_f769a4hiatmyqg9i","title":"Blog","url":"https://aaron.example"}]}
```

And the refusals, each with its code and exit:

```text
$ plugged-in handle claim --name aaron
[HN-001] HandleTaken
(exit 3)
$ plugged-in handle claim --name Aaron!
SchemaError: Expected a string matching the RegExp ^[a-z][a-z0-9]{0,31}$
  at ["name"]
(exit 2)
$ plugged-in link add --title x --url ftp://nope
SchemaError: Expected a string matching the RegExp ^https?:\/\/
  at ["url"]
(exit 2)
$ PLUGGED_IN_TOKEN= plugged-in link add --title x --url https://x.example
[AR-001] NotAllowed
(exit 3)
$ plugged-in session sign-in --email aaron@example.test --password wrong
[SE-001] SessionCredentialsWrong
(exit 10)
```

There's the clash from chapter 3: `HandleTaken` and `NotAllowed` both exit 3.

A bad payload shows a raw `SchemaError`, with the regular expression. That's fine for a developer and poor for a
person. 🔵 **Designed only**: field descriptions in the CLI's help and errors (M1.42); `InvalidPayload` has no refusal
code (K14's finding).

### Use it from the SDK

🟢 **Works today.** A script of my own, run with Node against the dev server:

```ts
import { Effect } from "effect";
import * as PluggedIn from "../generated/sdk/src/index.ts";

const program = Effect.gen(function* () {
  const page = yield* PluggedIn.profile.get({ handle: "aaron" });
  console.log(page.handle, page.links.map((l) => l.title));
  const missing = yield* Effect.flip(PluggedIn.profile.get({ handle: "nobody" }));
  console.log("refused:", missing._tag);
});

Effect.runPromise(program.pipe(Effect.provide(PluggedIn.layer("http://127.0.0.1:8797"))));
```

```text
aaron [ 'GitHub', 'Blog' ]
refused: ProfileNotFound
```

### Use it from an agent, over MCP

🟡 **Built but unproved here.** `/mcp` wants an OAuth access token from the app's own sign-in provider. A session
token is refused:

```text
$ curl -X POST http://127.0.0.1:8797/mcp -H "authorization: Bearer <session token>" … tools/list
{"error":"invalid_token"}
```

Check 14 on `m1` has a passing control that makes an MCP call with OAuth, so the path works in tests. I didn't walk
the OAuth flow by hand. 🔵 The agent's sign-in for a person is M2.06.

### Open the portal

🟡 **Built, but it's the old portal.** `http://127.0.0.1:8797/portal` opens. It's a plain table of operations and a
page per operation, from layer 2. With no logbook running it says so in a red banner, and every cell reads
"unavailable":

```text
plugged-in
Bundle unknown. Judged against unknown (this bundle's own model).  Observed 2026-11-19T11:57:53.748Z. Ledger read: unavailable.
The logbook could not be read: no logbook is configured for this portal. Nothing below is a proof.

Operations
Operation        test               staging               production               Notes
api-key.create   test unavailable   staging unavailable   production unavailable   test: no logbook is configured for this portal …
handle.claim     test unavailable   staging unavailable   production unavailable   …
```

The operation page, `/portal/operations/handle.claim`, shows the contract (who may call, payload, answer, the move,
refusals, steps), the hashes its proof rests on, and the docs page.

🔵 **Designed only: the portal Aaron agreed.** Things and lifecycles first, the live rail, the trace drawer, the
operations matrix, a proof tab, built through `@orthograph/portal-ui` (`design/portal.md`, M1.25 agreed 19 November;
on UI SDK once HeroUI leaves, K29). That is M1.13, not started. The portal-ui package exists (M1.34, merged); no page uses it yet.

🔵 **Designed only: the proof without a logbook.** Locally, prove's verdicts are in `.ortho/evidence/proven.json`, and
the portal doesn't read them. You only see proofs once a logbook runs (chapter 8).

---

## 8. Environments, and deploying to staging and production

An **environment** is where the app runs: on your machine, in a test world, in staging, in production. Each is a file
in `blueprint/environments/`. The app's code is the same in all of them; only the bindings change.

### The four files

🟢 **Works today** (as declarations). Whole files:

`blueprint/environments/local.ts`

```ts
import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // fixed test people, no sign-in
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  telemetry: [Telemetry.sink.local()], // prove's Collector, and the viewer while `ortho telemetry view` runs
});
```

`blueprint/environments/test.ts`

```ts
import { Blueprint, Cloud, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "a fresh world for each pull request",
  lifetime: "2 hours", // created and destroyed as one unit, with an owner and an expiry
  identity: Identity.testPrincipals,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
});
```

`blueprint/environments/staging.ts`

```ts
import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() }, // add a domain: Deploy.worker({ domain: "api.staging.example.com" })
  publish: { sdk: Deploy.npm({ tag: "next" }), cli: Deploy.npm({ tag: "next" }) },
});
```

`blueprint/environments/production.ts`

```ts
import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "staging", // only a revision with a green verdict there
  deploy: { server: Deploy.worker() }, // add a domain: Deploy.worker({ domain: "api.example.com" })
  publish: { sdk: Deploy.npm(), cli: Deploy.npm() },
});
```

### The flow, as designed and as built

The release flow is: build one bundle, prove it in a test world, promote that same bundle to staging, prove it
there, then promote it to production. A **logbook** keeps the signed verdicts. Production refuses a revision staging
hasn't proved. Each step:

**Build.** 🟢 **Works today**, once the tree is committed. (I committed the copied example in my scratch checkout,
locally; nothing was pushed.)

```text
$ ortho build
refused: the working tree differs from 6419d4b7: commit or stash what changed before building a deployable bundle
$ git commit …
$ ortho build
built 8ee6730e sha256:d306a3665e8dad66360ff5ec7ae1e7248a134a83fb4729105816d79e0dd680a7
```

One revision, one bundle, one hash. Every environment runs this file unchanged.

**The logbook, test, staging and production on your machine.** 🟢 **Works today on acme**, not yet run on Plugged In.
Gate 2's check 4 does the whole flow locally: `ortho env up test`, `env up staging`, `env up production` (each a local
workerd process), `ortho prove --env test`, then `ortho promote --to production` (refused, no staging verdict),
`promote --to staging`, `promote --to production`. It checks the same bundle hash runs everywhere, and that the
first release is 1.0.0 and the next 1.1.0. I ran it on `m1`:

```text
$ vitest run --config vitest.layer2.config.ts layer2/04-promotion
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Duration  155.32s
```

On Plugged In, the first step stops:

```text
$ ortho env up logbook
the logbook needs a policy: ORTHO_OIDC_ISSUER, ORTHO_OIDC_REPOSITORY, ORTHO_OIDC_REF and ORTHO_OIDC_WORKFLOW
$ ortho version --next
no logbook: start one with `ortho env up logbook`, or set ORTHO_LOGBOOK_URL
$ ortho publish --dry-run
no logbook: start one with `ortho env up logbook`, or set ORTHO_LOGBOOK_URL
```

The logbook trusts signed tokens from CI (GitHub's OIDC). Locally the gate stands up its own issuer process. A
developer has no command that does that for them. 🔴 **Hole**: there's no one-command local release flow, like
`ortho env up --all`, that starts the issuer, the logbook and the three environments for you. Today only the e2e
harness can.

**Staging and production in the cloud.** 🔵 **Designed only.** Nothing deploys to Cloudflare today. The generated
`wrangler.jsonc` says so itself:

```jsonc
// Generated from the blueprint. Do not edit.
// Local only: the database id is a placeholder until a deploy names a real one (stage two).
{
  "name": "plugged-in",
  "main": "main.ts",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    { "binding": "DB", "database_name": "plugged-in", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" }
  ],
  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["World"] }],
  // Where telemetry goes. `ortho prove` and `ortho dev --otlp` set it; unset, nothing is exported.
  "vars": { "OTLP_URL": "" }
}
```

The cloud pass for staging is M7.01 (the Cloudflare account Aaron uses for every environment for now, every resource prefixed, a cost estimate, and Aaron's
written yes per credential), then M7.03 and M7.04 (the infra projection, deploy and destroy). They can start after
Gate M2. Publishing the app's SDK and CLI for real (npm, Homebrew, GitHub) is M7.06; Orthograph's own first npm
release is M7.02. Nothing in this walkthrough touched a cloud.

🔵 **Designed only: secrets by declaration.** `staging` names Better Auth, which needs `AUTH_SECRET`. Today that's a
plain binding. `Blueprint.secret`, `ortho secrets set`, and environments that never name a secret by string are
M2.04.

🔵 **Designed only: what an environment binds.** Only an environment's name and lifetime reach a generator today
(K17). Domains in the clients, one wrangler file per environment, the portal per environment, and a chain's endpoint
and confirmation depth are K17's proposal (not yet decided; its Q4 asks Aaron whether the environment file declares
chains and adapters) and M7.03.

---

## 9. Adding wallets

Stage 2 of Plugged In: a person makes a wallet, and later gets paid by handle. The wallet is the first real plugin,
`@orthograph/wallets` (M1.29, merged on `m1`).

### Mount it

🟢 **Works today.** I ran `m1`'s own wallet demo script, `tools/demo/m1-wallet.sh`, pointed at Plugged In instead of
acme. It copies the app to a scratch folder, installs the wallet package from the repository, and mounts it:

```text
$ ortho add feature @orthograph/wallets
wrote blueprint/features/wallets.ts
pinned @orthograph/wallets 0.0.0 (local: no registry release to age)
needs none
next ortho generate, then ortho check
$ ortho generate
generated: the wallet's five operations are in the SDK, the CLI, the docs and the portal
$ ortho check
blanks left 0
types ✔
rules ✔
drift ✔
ratchets 0
check ✔
```

The mount is one file. `blueprint/features/wallets.ts`, whole:

```ts
// Scaffolded from @orthograph/wallets 0.0.0. Yours from now on.
import { Blueprint } from "orthograph";
import wallets from "@orthograph/wallets";

export default Blueprint.use(wallets);
```

### What it brings

The wallet is a thing with five operations: `create`, `import`, `keys`, `sign` and `send`. Here's `send`, from the
package (`packages/wallets/blueprint/things/wallet/verbs/send.ts`):

```ts
import { Blueprint } from "orthograph";
import { Wallet } from "../thing.js";
import { SimulationReverted, KeyLocked, NoSuchKey } from "../errors.js";

export default Blueprint.operation(Wallet, {
  description: "Simulate, sign, send and follow a transfer until it is confirmed.",
  payload: { signer: Blueprint.traced(Blueprint.text({ max: 16 })), label: Blueprint.traced(Blueprint.text({ max: 32 })), to: Blueprint.text({ max: 128 }), value: Blueprint.uint(256) },
  // A transaction hash and its level are public: the chain's own spans name the hash too.
  answer: { transaction: Blueprint.traced(Blueprint.text({ max: 128 })), level: Blueprint.traced(Blueprint.text({ max: 16 })), nonce: Blueprint.uint(64) },
  errors: [SimulationReverted, KeyLocked, NoSuchKey],
  allowed: [Blueprint.anyone],
  runs: "client",
});
```

`runs: "client"` is the **device runtime** (M1.27): the operation runs on the caller's machine, in the generated
client, with no server call. The key never leaves the device.

The **signer** says where a key lives: `node` (an encrypted file on your machine), `browser` (the page's wallet),
`keystore` (a server's key), or `world` (test wallets in a prove run).

### Use it on a real local chain

🟢 **Works today.** The demo starts Anvil (Foundry's local Ethereum chain) as a plain process, sets the wallet's
chain and keystore, and makes a passphrase it never shows. Then, through Plugged In's own command:

```text
$ anvil --silent --host 127.0.0.1 --port <free> --chain-id 31337 --accounts 0
eth_chainId 0x7a69

$ plugged-in wallet create --signer node --label demo --json
{"wallet":"wal_664252c6a495661f","account":"eip155:31337:0x664252C6A495661f2DFCE26F0671fc5614a873cB"}
$ plugged-in wallet create --signer node --label payee --json
{"wallet":"wal_9f6b05f3466048c1","account":"eip155:31337:0x9F6B05F3466048C1e91F5713A3eCc828388f69dF"}

the keystore holds encrypted files, no plain key:
demo.json
payee.json

$ plugged-in wallet keys --signer node
{"count":"2","accounts":"eip155:31337:0x664252C6A495661f2DFCE26F0671fc5614a873cB,eip155:31337:0x9F6B05F3466048C1e91F5713A3eCc828388f69dF"}

payee balance before: 0 wei
$ plugged-in wallet send --signer node --label demo --to <payee> --value 1000000000000000 --json
{"transaction":"0x0fedff2faf5809f7048313db65c1aedc84b0b9814d268be49a3aabfdbcd215e6","level":"confirmed","nonce":"0"}
payee balance after:  1000000000000000 wei
```

Every send is simulated first. One the chain would refuse is refused before anything is signed, and uses no nonce:

```text
$ plugged-in wallet send --signer node --label demo --to <payee> --value 1000000000000000000000000000000
INFO: the chain's simulation refused the transfer before anything was signed or sent (funds: EVM RPC request failed)
SimulationReverted
(exit 63)
$ plugged-in wallet send --signer node --label demo --to <payee> --value 2000 --json
{"transaction":"0xa772823fe2669d748453fa650ec01b4b629cfa0981e6e3c6f965de4809882f5a","level":"confirmed","nonce":"1"}
```

Without the passphrase, the keystore is locked:

```text
$ plugged-in wallet sign --signer node --label demo --message hello
INFO: the keystore is locked: no passphrase was given (ORTHO_WALLET_PASSPHRASE)
KeyLocked
(exit 61)
```

Account addresses are CAIP-10 (`eip155:31337:0x…`), so a Solana or Aztec account fits the same field later.

### Where it breaks

🟡 **Built but unproved here: the browser and server signers.** Their unit tests exist (`browser-host.test.ts`,
`server.test.ts`, which sends on Anvil from a server operation). I ran only the `node` signer.

🔵 **Designed only: the wallet knows nothing about Plugged In.** The wallet thing has one field, its id. It isn't tied
to a person or a handle. Stage 2 adds a `/wallet` page, "Pay @aaron", a `payment` thing kept from the chain's events,
and handles resolving to an address: ST2.01 to ST2.06. Linking a wallet you already have (sign in with Ethereum) is
M2.13. A token transfer needs the `erc20` adapter from an ABI, ST2.02.

🔵 **Designed only: confirmation depth.** `confirmed` means one block, hard-coded
(`packages/wallets/src/modules/submit/internal/flow.ts:29`, `port.track(submission, { depth: 1 })`). Fine on Anvil,
wrong on a real chain. M1.38; its check, check 18, is merged and red.

🔵 **Designed only: the chain's settings live in variables.** `ORTHO_WALLET_CHAIN`, `ORTHO_WALLET_RPC_URL` and the
passphrase come from the shell, not from an environment file. K17's Q4 proposes `chains` in the environment file;
it waits on Aaron.

🔵 **Designed only: client operations aren't guarded like server ones.** A device operation gets no role check, no
from-state check, no move and no idempotency; every caller is anonymous (K17, "The device runtime pre-handles almost
nothing"). K17 names this a gap "to close or to state openly".

---

## 10. Adding more features: auth and handles as plugins, then a workflow

### What a plugin is

A **plugin** is a package you mount with one file. Three kinds work today: a **feature** (things and operations,
like wallets), an **adapter** (someone else's service, called as a step), and a **projection** (an output, like the
SDK). K27 adds a **language** and a **host**, below. 🟢 **Works today**: `ortho add feature|adapter|projection` writes the mount and pins the version (M1.10, as you
saw with wallets). Mounts can choose, include, narrow and omit (M1.07).

### Auth as a plugin

🔵 **Designed only** (M2.01 to M2.07). Today Plugged In's people, sessions, organisations, invitations and API keys
are **copied** into its blueprint from the starter. Every app carries its own copy. M2.05 makes identity
`@orthograph/auth` (person, session, API key, Better Auth behind it), M2.06 adds the ways in (device sign-in, OAuth
for MCP), and M2.07 makes `@orthograph/organizations`. ST1.07 then deletes Plugged In's `person/` and `session/`
folders. After that, Plugged In's `blueprint/features/` would hold:

```ts
// blueprint/features/auth.ts (designed, M2.05; the exact shape is M2.01's decision)
import { Blueprint } from "orthograph";
import auth from "@orthograph/auth";

export default Blueprint.use(auth);
```

### Handles as a plugin

🔵 **Designed only** (ST1.02, ST1.03). Claiming a name is useful to many apps, so the handle moves into
`@orthograph/handles`, with a choice of name rules. K9 sketches the mount:

```ts
// blueprint/features/handles.ts (designed, K9 stage 1)
export default Blueprint.use(handles, (h) => [h.choose(h.choices.names.lowercase)]);
```

Plugged In keeps `profile` and `link`, its own things. The profile then appears *because* a handle was claimed: the
app's operation reacts to `HandleClaimed` through `on:`. 🔵 That reaction is M3.08. Until then the handler makes both
in one call, as Codex's does today.

### The screens

🔵 **Designed only** (ST1.25, ST1.04, ST1.06). The three pages (`/@aaron`, `/claim`, `/edit`) built on generated UI SDK
pieces (the web projection, one piece per operation, K29), served by the Worker. There is no web projection on `m1`.

### Your own feature

🔵 **Designed only** (M2.10). `ortho new feature notes` makes a plugin with its own world and CI; `ortho publish
--local` puts it in the local registry; another app mounts it with `ortho add feature`.

### A workflow

🔵 **Designed only** (M3.01, then M3.02 and M3.03). A **workflow** lives across many calls and owners: wait for a
signature, wait for a chain's event, then carry on. In Plugged In it first appears at stage 3: owners of a group's
Safe each sign a big spend, and it runs once the threshold is met (ST3.06). K5 sketched the shape; its exact form is
M3.01's decision:

```ts
// blueprint/workflows/publish.ts: illustrative; the exact shape is M3.01's decision (K5, seam 6)
export default Blueprint.workflow({
  description: "Put a frozen revision to the vote, and link the confirmed proposal back to it.",
  starts: { revision: Revision.fields.id },
  activities: {
    freeze:  Blueprint.activity.call(revision.freeze),                      // a D1 commit: body and digest frozen
    propose: Blueprint.activity.client(proposal.open, { by: "member" }),    // the member approves the wallet call
    seen:    Blueprint.activity.await(Governance.events.ProposalOpened,     // the confirmed event, with the
               { match: { proposal: "propose.proposal", digest: "freeze.digest" } }), //   expected proposal and digest
    link:    Blueprint.activity.call(revision.link),                        // a D1 commit: revision ↔ proposal
  },
});
```

What falls out, as designed: the run as a thing with its own machine, a durable wait per activity, replay that skips
finished work, and the run in the portal.

---

## 11. Where it goes next: other languages, such as Solidity

Everything so far runs as TypeScript on Effect, on a server or a device. The next step is code that runs **on a
chain**, in the chain's own language, generated from the same blueprint.

### What's there today

🔵 **Designed only.** The package exists and is empty. `packages/language-solidity/src/index.ts`, whole:

```ts
// @orthograph/language-solidity: the Solidity target.
export {};
```

The compiler refuses `runs: "chain"` today, because the only language, `language-effect`, runs everything on the
server (K17, from `describe.ts:227-228`).

### What K7 decided

K7 worked one declaration out by hand on three chains (EVM, Solana, Aztec) and ran a cross-check against one
reference machine: zero divergences. The rule: **our own programs are stores**, and each declared operation is
exactly one generated entry on the chain. Other people's programs are sources, reached through an adapter. A refusal
has one code on every wire. On an EVM, `AlreadyVoted` (`PR-001`) is a custom error:

```solidity
// spikes/chain-languages/evm/src/Governance.sol:16-19: one custom error each; its wire identity is a 4-byte selector
error AlreadyVoted(bytes32 proposal);   // PR-001
error ProposalExists(bytes32 proposal); // PR-002
error ProposalNotOpen(State state);     // PR-900 (Absent = "never opened")
error NotAllowed();                     // AR-001
```

### What K27 decided

🔵 **Decided, not yet built** (K27, 20 November 2026, replacing K17's "target"). Four questions, four words: what code
is written in is its **language**; where it runs once deployed is its **host**; which copy of that place is the
**environment**; how people reach it is a **projection**. The first, second and fourth are plugin kinds.
`language-effect` is the first language, served by `host-cloudflare` and `Host.node`; `language-solidity` on
`Host.chain` is next. A host supplies the store kinds of its place; a language writes for them.

```ts
// packages/orthograph (proposed, K27)
Blueprint.language({ frame, scaffold, surface, refusal, guards, writesFor });   // what code is written in
Blueprint.host({ supplies, wire, deploy });   // where it runs, how it's reached and deployed
```

For Plugged In, the handle could one day live on a chain: a contract with a `claim` function, its role check as a
generated modifier, its machine compiled into the contract, `HandleClaimed` as a log, and the **same** SDK function
`PluggedIn.handle.claim` calling it. The SDK, CLI, MCP, docs and portal come from the model, never from the
contract's ABI.

Each operation is taken by exactly one language on one host, and the SDK reaches it on that host's wire, so a device operation
still calls `Device.serve` and never goes over HTTP. The four questions are decided: one grid per language (Q1), the
language and host seam first (Q2, reshaped by K27), a private field on a public chain refused (Q3), and chains and adapters declared in the
environment file (Q4).

### When

The Solidity language is M6 (M6.01 starts from K7). Stage 3 (the vault) needs the budgets module generated by
`language-solidity` (ST3.05). Stage 4 (the club) brings Noir on Aztec (ST4.01 to ST4.08). Solana is later.

---

## What's true today, in one table

| Chapter | Step | Status |
|---|---|---|
| 1 | `npm create orthograph plugged-in` | 🔵 M2.09 |
| 1 | the Nx preset from a local registry | 🟢 (gives the starter, not Plugged In) |
| 1 | packages on npm | 🔵 the npm preview, after Gate M1 |
| 2 | `ortho add thing`, values, things, machines, `ortho model` | 🟢 |
| 2 | field descriptions | 🔵 M1.42 (K14 proposes the row) |
| 2 | secret values | 🟡 declared and kept out of telemetry; the one rule is M1.35 🔵 |
| 3 | operations, reads, errors, roles, events, `ortho check` | 🟢 |
| 3 | two refusals sharing an exit code | 🔴 Hole |
| 3 | `allowed` in the clients; typed refusals in the SDK | 🔵 M1.42, M2.03, M1.12 |
| 4 | `ortho generate`: API, server, SQL, SDK, CLI, MCP, docs, portal data, model | 🟢 |
| 4 | thing and event types in the SDK; CLI help | 🔵 M1.42 |
| 4 | the SDK sends a request key | 🔵 M1.12 |
| 4 | budget into the runtime | 🔵 M1.36 |
| 5 | today's scaffold, `ortho brief`, a filled handler | 🟢 |
| 5 | the scaffold explains itself (header, order, Match, refusal fields) | 🔵 K16: M1.44 to M1.48 |
| 6 | journeys, `prove --empty`, `prove`, traces, `impact`, `add journey` | 🟢 |
| 6 | `prove --only` judges only what it ran | 🔴 Hole |
| 6 | journey stubs from the machine | 🔵 M1.45 |
| 6 | journeys through the SDK, CLI and MCP | 🔵 M2.08 |
| 7 | `ortho dev`, the CLI, the SDK | 🟢 |
| 7 | MCP with OAuth | 🟡 a passing control in check 14; not walked by hand |
| 7 | the agreed portal | 🔵 M1.13 |
| 7 | the portal reading local proofs | 🔵 M1.13 |
| 8 | `ortho build` | 🟢 |
| 8 | logbook, test, staging, production, promote, on this machine | 🟢 on acme (Gate 2, check 4); not run on Plugged In |
| 8 | one command for the local release flow | 🔴 Hole |
| 8 | deploy to Cloudflare | 🔵 M7.01, M7.03, M7.04 |
| 8 | secrets by declaration | 🔵 M2.04 |
| 8 | environments bind domains, chains, adapters | 🔵 K17 (not decided), M7.03 |
| 9 | mount wallets; create, keys, send, sign on Anvil | 🟢 |
| 9 | browser and server signers | 🟡 |
| 9 | pay by handle; link a wallet; erc20 | 🔵 ST2.01 to ST2.06, M2.13 |
| 9 | confirmation depth per chain | 🔵 M1.38 |
| 9 | device operations guarded like server ones | 🔵 K17 (gap named) |
| 10 | `ortho add feature` | 🟢 |
| 10 | auth and organisations as plugins | 🔵 M2.05 to M2.07, ST1.07 |
| 10 | handles as a plugin; reactions with `on:` | 🔵 ST1.03, M3.08 |
| 10 | the web pieces and three screens | 🔵 ST1.25, ST1.04, ST1.06 |
| 10 | `ortho new feature` | 🔵 M2.10 |
| 10 | workflows | 🔵 M3.01 to M3.03 |
| 11 | Solidity, a language on `Host.chain` | 🔵 K7, K17, K27, M6 |

## How this was made

- `origin/m1` at `6419d4b7`, checked out fresh. `pnpm install`, nothing patched.
- Plugged In: `examples/links` from `origin/links/stage-1` (`ce7ff5b6`), copied in as `examples/plugged-in` with K15's
  renames (package name, bin, project name, one README path). The same copy the walkthrough spike (pull request 78)
  makes.
- Every 🟢 block was run by me on that checkout on 19 November 2026, and its output pasted. Long outputs are cut where
  marked `…`. Tokens, passphrases and passwords are never shown.
- Spawning ran `tools/e2e/starter.sh` (Gate 1's check 1) with `ORTHO_E2E_NAME=plugged-in`. The wallet chapter ran
  `tools/demo/m1-wallet.sh` pointed at Plugged In. The local promote flow ran Gate 2's check 4 on acme.
- No cloud, no credentials, no Docker. Every process started here was stopped.
