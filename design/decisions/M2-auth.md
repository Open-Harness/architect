# M2-auth: who is calling, how they got in, and what auth and organizations each own

Decided 21 November 2026 for slice M2.01 (the decision that opens milestone M2), drafted for the Goal 3 lead's sign-off,
under "Who decides" in `AGENTS.md`. Grounded at `origin/goal/stage-1` `61a7df04`; the slice plan was re-traced against
`b3fd9eec` (the ratchet lists, `tools/ci/builder-paths.sh` and the hashed baselines) after the first review. Line numbers
are at those commits.

This is a design record only: no code changes with it. It answers M2.01's five questions and gives the checks author of
M2.02 what they need to start. It builds on K2 (the frame), K3 (stores), K20 (roles across things), K22 (adopting a
mounted thing), M1-plugins (the mount), K1 section 1.3 (ways in) and K9 (the growing example); its landing rule is G12 (paired landing). It keeps every one of
Aaron's dated calls in them.

## In short

1. A caller is one of five kinds: `anonymous`, `person`, `agent` (acting for a person), `service(<mount>)` and `system`.
   An agent is a kind of its own, not a flag on a person, so code that only means "a person" cannot let an agent in by
   accident.
2. A person arrives by `Via.session`, `Via.key` or `Via.device`. An agent arrives by `Via.agent`: any credential made
   for an agent (an OAuth token, a key marked "for an agent", a run's key), and anything that comes in at `/mcp`.
3. A role says which person. `.via(...)` and `.notVia(...)` on an `allowed` entry say which ways in may use it. An agent
   passes a person's roles unless the entry says `.notVia(Via.agent)`. A mount's `narrow` can only take ways away.
4. `system` has no credential at all: it is what the runtime calls itself when it runs its own work. `service(<mount>)`
   is made only by an adapter's door, after the outside system proves who it is. Only a world can mint either for a
   journey, and only where `/_world/*` exists.
5. Better Auth becomes the auth plugin's worker entry (M2.05) and leaves `host-cloudflare` at M2.05b, once no app relies on the host's copy (Smaller calls 4). The generated server stops
   hard-coding it and imports whichever mounted plugin provides identity.
6. `@orthograph/auth` owns people, sessions, the key, device and agent credentials, `AUTH_SECRET` and the sign-in pages.
   `@orthograph/organizations` owns organisations, memberships, invitations and the API key an owner makes in one.
7. Everything moves as a copy first, with the operation names, error codes and exit numbers unchanged: `person.sign-up`,
   `session.sign-in`, `organization.create` and the rest keep them. Five things do change on acme's wire or in its model,
   each with the slice that makes it and who recaptures it ("What changes on the wire", below): `cap` leaves
   `organization.create` and the organisation, `acts` joins `api-key.create`'s payload, `via` joins `session.show`'s
   answer, the model gains a `via` per `allowed` entry and an `agentTool` per operation, and `issues` replaces `identity`.
8. Acme's `cap` on an organisation is acme's own, not the plugin's: it becomes acme's `allowance-policy` thing. That
   changes acme's wire: `organization.create` and `acme organization create` lose `cap` and `--cap`, `organization.get`
   and the organisation lose the field, and the cap is set by the new `allowance-policy.set`. M2.23 re-authors the checks
   and fixtures that send `cap`, and M2.07 lands with it as a pair (G12).
9. A plugin proves itself: an `example/` app, one `prove` target, one CI job for every plugin, one more before
   publishing. M2.10 builds it, to the list below.
10. Seven new slices come first, in two kinds: plugin starting worlds (M2.21 checks, M2.22 build), and five checks slices
    that exist because the plan was traced against what the repository enforces: acme without `cap` (M2.23), the two
    plugin skeletons (M2.24), acme mounting auth (M2.25), M2.06's journeys (M2.26) and the scaffold's checks (M2.27).
    Stage 1's own slices wait on them only through slices they already named (ST1.06 on M2.06, which needs M2.26, and
    ST1.07 on M2.05, which needs M2.24 and M2.25); ST1.03 and ST1.04 wait on none. The gate, M2.12, needs M2.21 to M2.27.
11. A slice that moves a byte of acme's wire, its model or its checked-in output lands as a pair, a check branch and a
    build branch (G12, "The pair map" below): M2.03 with M2.02's principal part, M2.05 with M2.25, M2.07 with M2.23 and
    M2.09 with M2.27. A builder never writes or deletes a journey: the plugin skeletons exist before the builders start.

Slices named in this record, in plain words: **M2.02** the plugin journeys (the moved part) and the principal journeys in
acme (the principal part); **M2.03** the new callers in the runtime;
**M2.04** secrets by declaration; **M2.05** the auth plugin; **M2.06** its ways in (device sign-in, MCP sign-in);
**M2.07** the organizations plugin; **M2.08** journeys through the SDK, CLI and MCP; **M2.09** `ortho new`; **M2.10**
`ortho new feature` and a plugin's CI; **M2.11** the work app mounts auth; **M2.05b** the host's Better Auth removed once no app relies on it; **M2.17 and M2.18** the checks and the build
for K20's `who` and `holds` roles; **M2.21 and M2.22** the new starting-world slices; **M2.23** the checks for acme without `cap`; **M2.24** the plugin
skeletons; **M2.25** the checks for acme mounting auth; **M2.26** the checks for M2.06's journeys; **M2.27** the checks for
the scaffold; **ST1.03** the handles plugin;
**ST1.04** Plugged In grown to stage 1; **ST1.06** the screens sign in through hooks; **ST1.07** Plugged In mounts auth.

## What was already decided, and kept

| Call | Where | What this record does with it |
|---|---|---|
| Five principals; ways in `Via.session`, `Via.key`, `Via.device`, `Via.agent`; a role asks which person; `.via` and `.notVia` decide which ways in may use it | K2 "Decided in the walkthrough" (`K2-forman-frame.md:43-45`) | kept; this record gives each its exact shape |
| Auth and organizations are two plugins; organizations needs auth; nothing is copied into a project | K2 (`:40-42`) | kept; moves below |
| `via` is recorded on the principal, `.via`/`.notVia` narrow an `allowed` entry, "no `via` means every way in" | K1 section 1.3 (`K1-kits.md:143-225`) | kept, except three passages of section 1.3 and 1.4 that change, each marked "Superseded by M2-auth" in K1 and listed under Supersedes. **Rule 2** (`:217-220`: an agent's OAuth token on HTTP is a person `via: "agent"`) becomes `anonymous`, because the token's audience is `/mcp` only and nothing issues one at the HTTP door (fork 2's table; AUT-16 says minting one in a world is untried). **Rule 3** (`:221-224`: "`via` is the credential, not the species") becomes "a key made for an agent is an agent", because under rule 3 any key walks past `.notVia(Via.agent)`, so K2's S20 rule (money out is `.notVia(Via.agent)`) is bypassed and M4's runs, which act as an agent over HTTP (`K10-factory.md:55`), cannot be agents at all (fork 2's rubric, "Correctness / integrity"). **The reach table** (`:240-241`: SDK and CLI by reach) is deferred, because the role check already refuses what reach would hide (small calls, 16); `later.md` carries it |
| A mount's `narrow` only removes ways in; an empty `via` is refused | M1-plugins section 3 (`:123`) | kept |
| Auth keeps Better Auth's tables in its own store | K3 item 7 (`K3-stores-and-sources.md:95-97`) | kept (small calls, 12) |
| A role is a `rule`, or declared with `who` or `holds` | K20 | kept; `service` becomes a fourth form |
| An app may adopt a plugin's thing under its own word | K22 | kept; used for `company` later, not needed in M2 |
| Stage 1 mounts `@orthograph/auth` and `@orthograph/handles`, and the scaffold is Plugged In at stage 1 | K9 (`K9-growing-example.md:47`, `:113-116`) | kept; the milestones' gate wording is corrected to match (see Supersedes) |
| Money going out is `.notVia(Via.agent)` by default | K2 S20 | kept; belongs to the Stripe plugin (M5) |

Nothing of Aaron's is changed. One call of the walkthrough is read narrowly: K2 lists "keys" under auth. Auth keeps the
key as a **credential** (the `ak_` bearer, the agent mark, the mint). The operation a person calls to make one
(`api-key.create`) needs an organisation's owner, so it goes with organizations; K1 already said so
(`K1-kits.md:832-835`, written before organizations became a plugin).

## The problem, in code

**A caller is two kinds and says nothing about how it got in.** Everything that decides who may call reads this:

```ts
// packages/orthograph/src/modules/roles/types.ts:5-8
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string };
```

`Via` exists, but only as a word a mount can pass to `narrow`. Nothing in the runtime ever reads it:

```ts
// packages/orthograph/src/modules/plugins/types.ts:9-10
export const Via = { session: "session", key: "key", device: "device", agent: "agent" } as const;
// ...and its one reader, a projection's filter (packages/projections/src/modules/mcp/internal/mcp.ts:14-15):
const ops = Object.values(model.operations).filter((o) => o.via === undefined || o.via.includes("agent"));
```

So an operation narrowed to `Via.session` is still callable with an API key, and the work app cannot say "the owner in
person, never an agent signed in for them" (`examples/work/blueprint/things/attention/verbs/approve.ts:11-13`).

**Auth is not a plugin; it is wired into every generated server.** The server imports Better Auth from the host, always,
and a project that wants no sign-in still gets `/api/auth/*`:

```ts
// packages/projections/src/modules/server/internal/server.ts (the generator's own text)
:89   import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@orthograph/host-cloudflare";
:125  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"]))
:140  readonly AUTH_SECRET: string;
:163  const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "<name>-cli" }));
:208  Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request))      // the /mcp door
:236  if (... pathname.startsWith("/api/auth/")) return Effect.runPromise(AuthD1.handle(routesOf(env), request))
```

The world's Durable Object builds Better Auth too, to sign the cast up for real
(`packages/host-cloudflare/src/modules/world/service.ts:25`, `world/internal/front-door.ts:23`).

**The environment says "test principals", and nothing believes it.** `identity: Identity.testPrincipals` is written in
every `local` and `test` environment (`examples/acme/blueprint/environments/local.ts:5`), and Plugged In's journey
README says it "gives each journey's `signedIn` cast member a fixed test person"
(`examples/plugged-in/journeys/README.md:43`). The code does not: the field is copied into the model and shown by the
portal (`packages/compiler/src/modules/model/internal/environments.ts:37`, `packages/portal/src/modules/pages/internal/env.tsx:8`) and
decides nothing. Every cast member of every world, Plugged In's included, is signed up for real through Better Auth:

```ts
// packages/host-cloudflare/src/modules/world/internal/front-door.ts:20-24
for (const name of [...strings(body.names), ...anonymous]) {
  ...
  const member = yield* AuthD1.castMember(auth, name, anonymous.has(name), stored);
// packages/host-cloudflare/src/modules/auth/service.ts:74: auth.api.signUpEmail({ body: { email, password, name } })
```

**The identity things are copied into every project.** Acme and `examples/starter` each hold six things
(`person`, `session`, `api-key`, `organization`, `membership`, `invitation`), five handler folders, two starting worlds
and five journeys, byte for byte the same except for acme's `cap` and its allowance. The work app copies `person`
(`examples/work/blueprint/things/person/thing.ts:3`). Plugged In copies none yet; ST1.04 is planned to.

**One of the copies is not identity at all.** Acme's organisation carries an acme rule, and the allowance reads it:

```ts
// examples/acme/blueprint/things/organization/thing.ts:8
fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Person.fields.id, cap: Amount },
// examples/acme/src/allowance/grant.ts:13-16
const cap = typeof refs.organization?.["cap"] === "bigint" ? refs.organization["cap"] : 0n;
if (limit > cap) { ... return yield* new AllowanceLimitTooHigh({ cap }); }
```

A plugin's organisation cannot have an acme field, and a plugin has no way to add fields to a thing, so `cap` needs a
home of its own (small calls, 8).

## What it touches

| Dependent | Why it cares |
|---|---|
| `orthograph` `roles/types.ts`, `roles/service.ts`, `plugins/types.ts` | the new principals, `Narrowed`, `Blueprint.system`, the `service` role, the descriptor's `provides` |
| `language-effect` `access/service.ts`, `handler/service.ts:161`, `handler/internal/attributes.ts:17`, `principals/types.ts`, `auth/types.ts`, `mcp`, `visibility` | the check, the request key's owner, the span's attributes, the contract the identity entry fills |
| `host-cloudflare` `auth/` (461 lines in 7 files), `world/`, `store/service.ts:46`, `package.json:11-20` | Better Auth leaves at M2.05b (M2.05 copies it into the plugin; the host's copy is the fallback until then, Smaller calls 4); the world's cast and the identity's tables go through the entry |
| `projections` `server`, `mcp` | the server imports the identity entry by mount; the MCP filter reads reach, not `via` alone |
| `compiler` model, `mounts/service.ts:65`, `model/internal/layout.ts:98` | `via` per `allowed` entry, `issues`, `agentTool`, plugin starting worlds, `provides` |
| `prove` `journeys/internal/world.ts:46-66`, `journeys/internal/load.ts:61` | the staging cast names Better Auth's routes; worlds load from the project only |
| `portal`, grid cells `roles.*`, `mount.*`, `error.telemetry` | who may call is said in words; the caller's kind is a span attribute |
| `portal` `telemetry/internal/calls.ts:13-15` (`callerOf`) | it reads `principal.person` before `principal.kind`, so an agent's accepted span (which carries `principal.person`, small calls, 2) would show as a person. M2.03 changes it to read `principal.kind` first and fall back to `person` only when the kind is absent; the portal's telemetry check gains an agent span |
| the checks, fixtures and baselines that send or hash acme's wire ("The pair map", below) | acme's `organization.create` loses `cap`, and four slices move other bytes of its output; each is re-authored or recaptured by the checks author of the pair (G12), never by a builder (`builder-paths.sh`). The grid's `e2e/grid/fixtures/acme/` are frozen copies (`e2e/grid/README.md:23`) and are not touched |
| `examples/acme/test/fixtures/evals/who-may-call/main.ts` | a frozen copy of acme's generated server, protected, with a README that tells the builder to regenerate it: the author recaptures it in every pair that moves the server |
| `examples/acme`, `examples/starter`, `examples/work`, `examples/plugged-in`, 33 files naming `Identity.` | the copies go; `identity:` becomes `issues:` |
| `docs/canon` (`handlers.mdx:83` quotes `HandlerContext`; `operations.mdx:514-518` asks the request-key question) | quotes move with the code; the question gets its answer |
| M2.02 to M2.11, M2.17/M2.18, M2.23 to M2.27, ST1.03, ST1.04, ST1.06, ST1.07, M3 and M4 | all of them are built on what is decided here |

## Fork 1: what a caller is

**Today** (`roles/types.ts:5-8`, above): two kinds. An agent acting for a person is the person.

**A · Five kinds; an agent is its own kind** (recommended)

```ts
// packages/orthograph/src/modules/roles/types.ts (proposed)
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string; readonly via: "session" | "key" | "device" }
  | { readonly kind: "agent"; readonly person: string; readonly email?: string; readonly via: "agent" }   // acting for `person`
  | { readonly kind: "service"; readonly mount: string }                                                  // an adapter's door
  | { readonly kind: "system" };                                                                          // the runtime's own work

/** Someone's hands: a person, or an agent acting for one. What a role's rule is given, so `principal.person` still works there. */
export type Acting = Extract<Principal, { readonly person: string }>;
export const acting = (p: Principal): Acting | undefined => (p.kind === "person" || p.kind === "agent" ? p : undefined);
```

A handler that needs the person writes `const who = acting(principal); if (!who) return yield* Effect.die(...)`; one
that meant "only a person" writes `principal.kind !== "person"` and is refused the agent by its own words.

**B · K1's shape: a person with a `via`; an agent is `via: "agent"`**

```ts
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string; readonly via: Via }
  | { readonly kind: "service"; readonly mount: string }
  | { readonly kind: "system" };
```

**C · Stay at two kinds** (the work app's stand-in: `owner.of("mission")` "is the owner either way until it can",
`examples/work/.../approve.ts:11-13`).

### You do X → what happens

| Scenario | A · five kinds | B · person with `via` | C · two kinds |
|---|---|---|---|
| Olga's agent calls `invitation.accept`, whose handler guards `principal.kind !== "person"` (`examples/acme/src/invitation/accept.ts:11`) | the handler's guard refuses it as a defect, which is why M2.03 changes those guards once, on purpose | passes the guard; only `.notVia(Via.agent)` on the declaration stops it | the agent is Olga |
| A new handler checks `principal.kind === "person"` and forgets agents | the agent is outside: safe by default | the agent is inside: unsafe by default | n/a |
| A trace says who called | `principal.kind=agent`, `principal.person=per_olga` | `principal.kind=person`, `principal.via=agent`: a "person" that is an agent | `principal.person=per_olga` |
| A `switch (principal.kind)` over service and system | exhaustive over five | exhaustive over four | n/a |
| Rules already written (`(instance, principal) => ... principal.person`) | unchanged: they receive `Acting` | unchanged | unchanged |

### Rubric

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ the real thing: agent, service and system exist in code | ✅ same, one kind fewer | ❌ promises, ships nothing |
| Reversibility | ⚠️ the 16 guards (15 unprotected and the starter's fixture) change once, then B is a type edit | ✅ | ✅ |
| Blast radius | ⚠️ runtime 3 sites, plugin handlers 5, Plugged In 2, canon quote | ✅ smallest | ✅ none |
| Correctness / integrity | ✅ "not a person" is the default for new code | ❌ every `kind === "person"` check silently admits agents | ❌ F4 8.10 stays unprovable |
| Fit | ✅ K2 and K10 say "the agent principal" (`K10-factory.md:55`) | ⚠️ K1's, older | ❌ |

Sixteen places test a principal's kind against `"person"`, and each is a place an agent must be thought about once:
`examples/acme/src/{api-key/create,invitation/accept,invitation/send,organization/create,session/show}.ts` (five, which
move into the plugins and change there), `examples/plugged-in/src/{handle/claim,link/add}.ts` (two), the same five in
`examples/starter` and one starter test fixture (deleted with the starter, M2.09), and three in the runtime
(`access/service.ts:64`, `handler/service.ts:161`, `handler/internal/attributes.ts:17`).

**Recommendation: A.** It is the shape K2 and K10 already use in words, and it makes "a person only" the safe default
for every handler anyone writes after today.

## Fork 2: what `Via.agent` is, how `.via` and `.notVia` work, and who tells the ways in apart

**Today:** nothing tells them apart. A bearer token goes to `getSession`; an `ak_` key goes to `x-api-key`; an OAuth
access token is understood only at `/mcp`, so on HTTP it reads as anonymous
(`packages/host-cloudflare/src/modules/auth/service.ts:15-23`). K1 would call an agent a person who holds an OAuth token
and nothing else (`K1-kits.md:221-224`: "an agent handed a person's API key is `via: key`").

**A · `Via.agent` is a credential made for an agent; `/mcp` is the agent door** (recommended)

```ts
// .via and .notVia narrow an `allowed` entry; the model records the kept ways in
allowed: [owner.of("organization").via(Via.session, Via.device)]   // in person, never a key, never an agent
allowed: [invitee.notVia(Via.agent)]                               // = .via(session, key, device): an agent can't consent
allowed: [owner.of("organization")]                                // no narrowing: all four, an agent passes Ada's role
```

| The credential | Door | Principal |
|---|---|---|
| a session token from `session.sign-in` | HTTP, SDK, CLI | `person`, `via: session` |
| a session made by the device flow (marked in its row) | HTTP, SDK, CLI | `person`, `via: device` |
| an `ak_` key made for a person | HTTP, SDK, CLI | `person`, `via: key` |
| an `ak_` key made **for an agent** (`acts: "agent"`, recorded with the key) | HTTP, SDK, CLI | `agent` for the key's person |
| anything above, or an OAuth access token (audience `/mcp`) | `/mcp` | `agent` for the person it names: the door decides |
| an OAuth access token | HTTP | `anonymous`: its audience is `/mcp` only |
| a world token `wld_…` | HTTP or `/mcp`, only where `/_world/*` exists | whatever it was minted for, `service` and `system` included |
| nothing, or a bad credential | any | `anonymous`, never an error |

**What `.via` and `.notVia` mean.**

- They go on any `allowed` entry that has a person in it: `Blueprint.signedIn`, a role, a role's `.of(path)`. Not on
  `anyone`, `system` or a `service` role (those have no way in to narrow).
- `.notVia(x)` is `.via(all four except x)`. The model stores the kept list. An empty list is a compile error naming the
  file, as a mount's empty `via` is today (`mounts/internal/verbs.ts:34`). An entry is narrowed at most once.
- An entry admits a person or an agent only when its role holds **and** the principal's `via` is in the list.
- **The mount's `narrow` and the entry's `via` both apply**: a call is allowed when some entry admits the principal and
  the operation's mount-level `via` (if any) contains the principal's `via`. A mount can only take ways away, never add
  one an entry removed.
- `service` and `system` principals have no `via` and are not narrowed by either.
- The MCP door lists a tool when some entry admits `agent`, the mount-level `via` admits `agent` and the operation does
  not run on the client. This replaces the one-line filter at `mcp.ts:15`, and is the model's `agentTool` flag
  (K5's tool-exposure rule, `K5-the-whole-shape.md:337`, `:368`; `docs/canon/doors.mdx:207`). CLI and SDK are not hidden by reach in M2 (small calls, 16).
- What a caller is shown follows the principal's kind, not the door: an agent gets the agent audience of the one
  visibility rule (`visibility/internal/rule.ts:13-14`) on HTTP too, so an agent never receives an issued secret.

**B · K1 rule 3: `via` is the credential only; `Via.agent` means an OAuth token and nothing else**

```ts
// an agent handed a person's `ak_` key is `via: key`; `.notVia(Via.agent)` does not stop it. To stop it too:
allowed: [owner.of("organization").via(Via.session, Via.device)]
```

**C · Agents only through MCP** (M1-plugins section 3 read as "MCP is the only agent door"): HTTP and the SDK always
make a person.

### You do X → what happens

| Scenario | A · made for an agent | B · OAuth only | C · MCP only |
|---|---|---|---|
| Olga's Claude Code, signed in over MCP, calls `invitation.accept` (`.notVia(Via.agent)`) | refused: it is an agent | refused | refused: not a tool |
| Ada gives her CI a key to run an agent, and makes it "for an agent" | the CI's calls are agent calls; `.notVia(Via.agent)` refuses them | the CI is a person via `key`; money-out is open to it | same as B |
| The agents feature (M4) runs a model that calls the SDK "as agent for Ada" (`K10-factory.md:55`) | its run key is an agent key: works | cannot be an agent on HTTP at all | cannot |
| Ada hands her own person key to an agent | a person via key: Ada's act, as handing over a password | the same | the same |
| An OAuth token is sent to `POST /organization/get` | anonymous: the audience is `/mcp` | anonymous | anonymous |
| A journey needs an agent over HTTP and over `/mcp` | one agent key works at both doors | needs OAuth in every world: untried (AUT-16, PRF-08) | n/a |

### Rubric

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ every door resolves every credential; worlds mint keys, no OAuth dance needed | ⚠️ needs OAuth minting in worlds first | ✅ nothing to build |
| Reversibility | ✅ the `acts` mark is one column | ✅ | ✅ |
| Blast radius | ⚠️ `Principals.of` takes the door; keys carry a mark | ⚠️ the same | ✅ |
| Correctness / integrity | ✅ `notVia(Via.agent)` means what the docs say (`design/docs/index.html:629-631`) | ❌ the S20 rule ("money out is `.notVia(Via.agent)`") is bypassed by any key | ❌ M4's runs cannot act |
| Fit | ✅ K2: "agent, acting for the person who started it"; K1 sections 1.3 and 4.3 | ✅ K1 | ⚠️ M1's wording |

**Recommendation: A.** It is the only option under which S20 and the agents feature both work, and it removes the open
risk of minting OAuth tokens in a world: a world mints an agent key, and the real OAuth dance is proved once, in M2.06's
MCP sign-in journey.

## Fork 3: `service(<mount>)` and `system`

**Today:** neither exists in code. The frame says `system` is "the keeper's own key, limited to time moves"
(`design/frame/README.md:156`), and `design/docs/index.html:626-636` spells `Blueprint.system` and
`Blueprint.role(Payment, { service: stripe })`. No slice says how either is made.

**A · The runtime and the doors make them; no credential exists for `system`** (recommended)

```ts
// who admits them (the spellings the docs already use)
allowed: [Blueprint.system]                                  // only the runtime's own work: the keeper's time moves, on:, workflows
export const processor = Blueprint.role(Payment, { service: stripe });   // only service(stripe), the adapter mounted as `stripe`
allowed: [processor, owner.of("organization")]               // a service and a person, side by side
```

- `anyone` admits all five kinds. `signedIn`, every rule role and every `holds` or `who` role admit `person` and `agent`
  only, so a service or the system is refused `NotAllowed` there. `Blueprint.system` admits `system` only; a `service`
  role admits `service(<its mount>)` only.
- `system` is never read from a request. It is what the runtime gives itself when it calls an operation from inside:
  `on:` (M3.16), the keeper, a workflow. There is nothing to steal, which an "own key" would be.
- `service(<mount>)` is made only by an adapter's door, after the outside system's own check (Stripe's signature,
  M5). Nothing in M2 builds a door; M2 builds the kind, the role, the check and the journey caster.
- In a world, the world's door mints a token for a journey: `POST /_world/credential` with `{ name, via }`, or
  `{ system: true }`, or `{ service: "<mount>" }`. The token is `wld_` and the secret-derived signature, and the server
  accepts it only where `/_world/*` is answered (`hostsWorlds`, `server.ts:187-188`), so staging and production cannot be
  fooled by one.

**B · A real system key** (the frame's wording): a credential the keeper holds, limited to time moves.

**C · `system` is a service of a built-in mount** (`service(system)`): one kind fewer.

### You do X → what happens

| Scenario | A · runtime-made | B · system key | C · `service(system)` |
|---|---|---|---|
| `allowance.reset` is `allowed: [Blueprint.system]` and Bob sends a request to it | refused: no request can be `system` | refused unless he has the key | refused |
| The key leaks (a log, a laptop) | nothing to leak | the attacker is the system | nothing to leak |
| A journey must prove "the system may reset, a person may not" | the world mints a `wld_` token for `system` | the world mints the key | the world mints one |
| The portal shows a caller | `system` | `system` | `service(system)`, which reads like an outside party |
| An adapter named `system` is mounted | no clash | no clash | a clash with the built-in |

### Rubric

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ the kind, the role and the check ship in M2 | ❌ a secret to declare, rotate and scope | ✅ |
| Reversibility | ✅ | ⚠️ keys, once issued, are hard to retire | ⚠️ |
| Blast radius | ✅ runtime and compiler | ❌ plus secrets and a key store | ⚠️ the reserved name |
| Correctness / integrity | ✅ cannot be forged from outside | ❌ | ⚠️ |
| Fit | ✅ `on:` calls "as system" (K2 S22) without a credential | ⚠️ | ⚠️ |

**Recommendation: A.** It follows what `system` is: the runtime's own hands.

## Fork 4: where Better Auth lives once auth is a plugin

**Today:** `AuthD1` is in `host-cloudflare` (`packages/host-cloudflare/src/modules/auth/`, 461 lines in `service.ts`,
`types.ts`, `internal/{instance,oauth,options,schema}.ts` and a test); its contract (`Auth`, `AuthRefused`, `Principals`)
is in `language-effect` (`auth/types.ts:3-15`, `principals/types.ts:5-8`); the generated server and the world call it by
name (above). The plugin shape M1 built gives a feature a pure descriptor, a pure `blueprint/`, and a `src/` with a
handler per operation and an optional `layer` for its own handlers (M1-plugins sections 1 and 8, `packages/wallets`).

**A · The plugin's worker entry is the identity** (recommended; M2.05's own wording is "Better Auth behind its worker
entry")

```ts
// packages/language-effect/src/modules/identity/types.ts (new: the contract only; today's Auth and Principals stay beside it)
export interface IdentityEntry {
  /** Principals and Auth, provided to every handler on every door. The one exception to "a plugin's layer is for its own handlers". */
  readonly layer: Layer.Layer<Principals | Auth>;
  /** Routes the identity answers itself (`/api/auth/*`, OAuth discovery, `/login`, `/consent`, `/device`); undefined: not its. */
  readonly routes: (request: Request) => Effect.Effect<Response | undefined>;
  /** Who the MCP door's bearer is for, and the `WWW-Authenticate` challenge (today `AuthD1.oauth`). */
  readonly bearer: (request: Request) => Effect.Effect<Bearer>;
  readonly challenge: (request: Request, error?: "invalid_token") => string;
  /** A world: sign the cast up for real, and mint each credential kind (`POST /_world/cast`, `/_world/credential`). */
  readonly cast: (name: string, spec: CastSpec) => Effect.Effect<CastMember>;
  readonly credential: (spec: CredentialSpec) => Effect.Effect<{ readonly token: string }>;
  /** Identity tables whose rows of the cast survive a world's reset (today `KEPT`, `world/internal/reset.ts:14`). */
  readonly keep: ReadonlyArray<{ readonly table: string; readonly column: string }>;
}
// packages/auth/src/worker.ts: `export default (made: { db: D1Database; secrets: ...; settings: ... }) => IdentityEntry`
```

```ts
// packages/auth/feature.ts: the descriptor says it provides identity, and names the thing the runtime reads people from
export default Blueprint.feature({
  description: "People, sessions, API keys and agent credentials: who is calling.",
  provides: { identity: { thing: Person, table: "auth_user" } },   // closes AUT-42; replaces IDENTITY_THING = "person" (server.ts:32)
  choices, settings, needs: [],
});
```

The generated server imports the entry of the one mount whose descriptor `provides` identity
(`import identity from "@orthograph/auth/src/worker.js"`: allowed by the import rule, M1-plugins section 8), hands it its
binding, its secrets and its settings (the server is the one place that reads the environment,
`design/frame/secrets.md:107-108`), and uses it where it says `AuthD1` today. Two mounts providing identity is a `check`
error naming both files. **No mount providing it** gives `Identity.none` once M2.05b has deleted the host's copy (until then the host's Better Auth, Smaller calls 4): everyone is anonymous, there are no
`/api/auth/*` routes, `/mcp` answers 401 with no way to sign in, and `signedIn` operations are refused: a project that
wants no sign-in gets none.

**B · Leave Better Auth in the host; the plugin only declares things and choices**

```ts
// packages/auth/feature.ts: things and choices; the server still imports AuthD1 from host-cloudflare
export default Blueprint.feature({ description: "...", choices });
```

**C · A second host package, `@orthograph/host-cloudflare-auth`**, holding the Better Auth code; the plugin depends on it.

### You do X → what happens

| Scenario | A · worker entry | B · stays in host | C · its own host package |
|---|---|---|---|
| Plugged In "mounts auth" (ST1.07) | the mount brings Better Auth; no mount, no sign-in | the mount only brings two things; sign-in is there either way | the mount brings a dependency on the package |
| `AUTH_SECRET` declared by the plugin (M2.04, `frame/secrets.md:81`) | the plugin's entry receives it as `Redacted` | declared by a plugin that never reads it | received by the entry |
| A second identity provider (a different plugin) | mounts instead; the contract is the same | impossible: the host is hard-wired | possible, with two packages to keep |
| `host-cloudflare` depends on Better Auth, jose, oauth-provider (`package.json:11-20`) | no longer, after M2.05b | still | still, in its sibling |
| Size of M2.05 | L (as the row says) | M | L, plus a package |

### Rubric

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ auth is a plugin, as K2 says | ❌ auth is a label | ⚠️ |
| Reversibility | ✅ the entry is a folder move | ✅ | ⚠️ |
| Blast radius | ⚠️ server generator, world DO, host exports, prove's staging cast, 3 package.json | ✅ | ⚠️ |
| Correctness / integrity | ✅ one mount decides; unmounting removes Better Auth | ❌ the project cannot refuse it | ✅ |
| Fit | ✅ M1-plugins section 8 (`src/` by host), K3 item 7 | ❌ K2: "nothing of either is copied", but it is also not owned | ⚠️ one more package kind |

**Recommendation: A.**

## Fork 5: which plugin owns the API key

**Today:** `api-key` is one of the six copied things, and it is the one that crosses the line between identity and
tenancy:

```ts
// examples/acme/blueprint/things/api-key/thing.ts:7
fields: { id: Blueprint.id("key"), organization: Organization.fields.id, name: Blueprint.text(), createdBy: Person.fields.id },
// examples/acme/blueprint/things/api-key/verbs/create.ts:11
allowed: [owner.of("organization")],
// examples/acme/src/api-key/create.ts:13: the key is made for the person, not the organisation
const issued = yield* steps.issue(auth.createApiKey({ person: principal.person, name }));
```

The organisation on a key records where it was made. It restricts nothing: the key calls as the person with all their
roles (`host-cloudflare/.../auth/service.ts:44`, `createApiKey({ body: { userId: person, name } })`; AUT-07 is the open
question of scoping a key to one organisation). Auth cannot own this operation, because `owner` is organizations' role and
organizations needs auth (K1 `K1-kits.md:832-835`).

**A · The credential is auth's; the operation is organizations'** (recommended)

```ts
// @orthograph/auth, src/worker.ts: Better Auth's key plugin, `ak_` resolved to a person, `acts` recorded with the key
// @orthograph/organizations, blueprint/things/api-key/verbs/create.ts
allowed: [owner.of("organization").via(Via.session, Via.device)],      // a key or an agent cannot mint a key
payload: { organization: ApiKey.fields.organization, name: ApiKey.fields.name, acts: ApiKey.fields.acts },   // acts: "person" | "agent", default "person"
```

**B · Both plugins have a key operation**: auth's `api-key.create` for a person, organizations' for an organisation.
Two things named `api-key` clash (M1-plugins section 12), so one would be renamed and acme's CLI command
(`acme api-key create`) would change.

**C · Auth owns `api-key.create`, person-level; the organisation field is dropped**

### You do X → what happens

| Scenario | A · organizations owns the operation | B · both | C · auth owns it |
|---|---|---|---|
| Acme's `acme api-key create --organization org_1` | unchanged | unchanged, plus a second command | the `--organization` flag is gone |
| Plugged In (auth only) | has no key operation: not needed, stage 1 signs in by device and OAuth | the same, or a person key | has a person key |
| "An owner makes a key; a non-owner is refused" (M2.02's journey) | stays true | stays true | cannot be said: there is no owner |
| An agent mints itself a key | refused: not `session` or `device` | refused in one, open in the other | open unless narrowed |
| A key for a person needs organizations mounted | yes | no | no |

### Rubric

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ moves what runs, changes only the way in | ❌ two things, a rename | ✅ |
| Reversibility | ✅ a later person-level key is a new thing with another name | ⚠️ | ❌ the field and its journey are gone |
| Blast radius | ✅ one folder, one new field `acts` | ❌ CLI, docs, journeys | ⚠️ the wire changes |
| Correctness / integrity | ✅ "the owner of the organisation, in person" is what the journey says | ⚠️ | ⚠️ drops a real refusal |
| Fit | ✅ K1's rule: a plugin's operations use only its own roles and its needs'; K2: keys are auth's credentials | ❌ | ⚠️ |

**Recommendation: A.** The two narrowings (`api-key.create`, `invitation.accept`), the `acts` field and `session.show`'s
`via` answer are the only changes to behaviour in the whole extraction; each is a refusal that did not exist before or an
added field, never a new permission.

## What each plugin owns

`@orthograph/auth` (package `packages/auth`) and `@orthograph/organizations` (package `packages/organizations`) follow
`packages/wallets`: a pure `feature.ts`, a pure `blueprint/`, a `src/` with a handler per operation and modules in the
six-slot shape, built to `dist` by `tsc`, `orthograph: { kind: "feature" }` in `package.json`, tags `scope:<name>`,
`env:runtime`, `layer:1` (and `kind:plugin`, see the CI section). A project imports a plugin's pure entries, so `scope:project` may depend on `scope:auth` and `scope:organizations` in
`.oxlintrc.json` (both constraint blocks, `:50-55` and `:161-165`), as it may on `scope:projections` since M1.11; each new
package also gets a line in `design/packages.md`.

```text
packages/auth/                       @orthograph/auth: who is calling
  feature.ts                         Blueprint.feature({ provides: { identity }, choices, settings, needs: [] })
  blueprint/
    things/person/{thing,errors}.ts  verbs/sign-up.ts
    things/session/{thing,errors}.ts verbs/{sign-in,show}.ts
    values/identity.ts               Password, Secret
    stores/auth.ts                   Blueprint.store.database(): Better Auth's tables, nowhere else (K3 item 7)
    secrets.ts                       export const secret = Blueprint.secret.generated(...)   -> AUTH_SECRET
    choices.ts                       signIn, keys (M2.06)        settings: sessionLength, allowedOrigins (M2.06)
    journeys/*.ts                    the plugin's own journeys (authored in M2.02, placed here by M2.24)
  src/
    person/sign-up.ts  session/{sign-in,show}.ts     the handlers, moved from acme's src/
    worker.ts                         the identity entry
    modules/better-auth/              moved from host-cloudflare/src/modules/auth (six slots)
    modules/credentials/              session via marks, the `acts` mark, `wld_` tokens for worlds
    modules/pages/                    /login, /consent, /device: plain pages (see "The sign-in pages")
  example/                            the plugin's own app (M2.10)

packages/organizations/              @orthograph/organizations: who belongs where     needs: [auth]
  feature.ts
  blueprint/
    things/organization/{thing,machine,events,roles}.ts   verbs/{create,get}.ts
    things/membership/{thing,roles}.ts                    verbs/get.ts
    things/invitation/{thing,machine,events,roles}.ts     verbs/{send,accept,revoke}.ts
    things/api-key/thing.ts                               verbs/create.ts
    values/role.ts                   the literal "owner" or "member"
    starting-worlds/{founded,invited,joined}.ts
    journeys/*.ts
  src/ organization/create.ts  invitation/{send,accept,revoke}.ts  api-key/create.ts
  example/
```

| | `@orthograph/auth` | `@orthograph/organizations` |
|---|---|---|
| Things | `person`, `session` | `organization`, `membership`, `invitation`, `api-key` (gains the field `acts`) |
| Operations (wire names unchanged) | `person.sign-up`, `session.sign-in`, `session.show` | `organization.create/get`, `membership.get`, `invitation.send/accept/revoke`, `api-key.create` |
| Runtime | Better Auth, `Principals`, `Auth`, `/api/auth/*`, OAuth for MCP, device flow, the `ak_` key, the `acts` mark, cast and credentials for worlds | none: it uses `Auth.createApiKey` from the identity entry |
| Roles | none of its own (`signedIn` is built in) | `owner`, `member` (`holds` roles once K20 builds, M2.18), `invitee`, `holder` |
| Starting worlds | none (the cast signs up) | `founded`, `invited`, `joined` |
| Secrets, settings | `AUTH_SECRET`; `sessionLength`, `allowedOrigins` | none |
| Needs | none | `auth` |
| Person's id | owns `per_` | refers to `Blueprint.id("per")` |

**`show` gains one answer field**: `session.show` answers `{ person, email, via }`, with `via: Way`
(`type Way = "session" | "key" | "device" | "agent"`, exported by `orthograph` beside `Via`, the narrow literal type and not
`string`), so a journey can see how a call got in and a typo in `toBe("keey")` does not compile. An additive field, the only
observable of the new principals that needs no new operation. Acme's own `show` gains it at M2.03, so the principal journeys
can read it before any plugin exists; the plugin's `show` carries it from the skeleton (M2.24).

**An organisation's `owner` field stays** (`organization.get` still answers it, though no longer `cap`;
`OrganizationCreated` carries it). It is the founder at creation; the `owner` role no longer reads it once `holds` lands
(K20), it reads the membership row. One operation writes both, so they cannot drift until an operation changes an owner;
that operation would change the membership and leave the field as "founder".

## The moves, one by one

Every move is a copy first: the plugin's file is the acme file, with the imports pointing at its siblings and the changes
this record names, and acme's file is deleted by the slice that mounts the plugin. Operation names, error codes and exit
numbers do not change. What does change on acme's wire and in its model is listed once, in the next section, and every
slice that moves a byte of acme's output lands as a pair (G12), so a builder never writes or deletes a journey, an eval
fixture or a baseline.

| Move | From | To | Slice | Blast radius |
|---|---|---|---|---|
| Better Auth and its contract | `packages/host-cloudflare/src/modules/auth/**` (7 files), `README.md`, `scripts/auth-schema.ts` | `packages/auth/src/modules/better-auth/**`; the contract stays in `language-effect` and gains `IdentityEntry` | M2.05 copies it; M2.05b deletes the host's copy | `host-cloudflare` keeps `AuthD1` and its Better Auth dependencies (`package.json:11-20`) only as the fallback for an app that mounts no identity (Smaller calls 4); `world/service.ts:25`, `world/internal/front-door.ts:23`, `world/types.ts:5-8` and `reset.ts:14` take the entry instead; `server.ts` (7 sites above); `auth.test.ts` is copied |
| `person`, `session`, `values/identity.ts` (`Password`, `Secret`) | `examples/acme/blueprint/things/{person,session}/**`, `blueprint/values/identity.ts` | `packages/auth/blueprint/**`; acme keeps `Ok` in `values/health.ts` (`things/system/verbs/health.ts:3`) | M2.05 | acme's `allowance` (`thing.ts`) imports `Person` and now reads it from `@orthograph/auth/blueprint/things/person/thing.js`; protected files that import acme's copies are repointed by M2.25: `journeys/sign-up-and-sign-in.ts`, `journeys/invite-and-accept.ts:8`, `journeys/grant-an-allowance.ts:7`, `test/fixtures/evals/who-may-call/main.ts:47-48` |
| the handlers | `examples/acme/src/{person,session}/**` | `packages/auth/src/{person,session}/**` | M2.05 | the guards (fork 1) change here once |
| `organization`, `membership`, `invitation`, `api-key`, `values/identity.ts` `Role` | `examples/acme/blueprint/things/{organization,membership,invitation,api-key}/**` | `packages/organizations/blueprint/**` | M2.07 (after M2.05, M2.18, M2.22, M2.23, M2.24) | acme's `allowance` (`thing.ts` and its three verbs) imports `owner` and `Organization`; every acme journey, starting world and eval fixture that imports an organizations file is repointed or deleted by M2.23 (list in "The pair map") |
| the handlers | `examples/acme/src/{organization,invitation,api-key}/**` | `packages/organizations/src/**` | M2.07 | none beyond the above |
| starting worlds | `examples/acme/blueprint/starting-worlds/{founded,invited}.ts` | `packages/organizations/blueprint/starting-worlds/{founded,invited,joined}.ts` (declared in M2.24, handlers filled by M2.07); acme keeps `funded` and gains `capped` (M2.23) | M2.24 (the plugin's), M2.23 (acme's) | `funded` still starts `from: "founded"`, which needs the mount fold (M2.22). Acme's own `founded` and `invited` are deleted by M2.23's author commits, because a plugin world with the same name as an app's is a `check` error. `starting-worlds/` is not in `builder-paths.sh`'s protected list, so CI would not stop a builder writing a world; the decision keeps worlds with the author because each file's header calls it a journey-author file |
| journeys | acme's `sign-up-and-sign-in` (auth); `an-owner-makes-an-api-key`, `invite-and-accept`, `an-invitation-is-used-once` (organizations) | the plugins' `blueprint/journeys/`: authored in M2.02 as stand-ins, placed in the packages by M2.24 | M2.24 places them; acme's copies are deleted by the author, never the builder: auth's in M2.25, organizations' in M2.23 | acme's `outsider-cannot-revoke` is about `allowance.revoke`: it stays. M2.05 and M2.07 fill handlers and write no journey |
| the cap | `organization.fields.cap`, `organization.create`'s `cap`, `grant.ts:13` | acme's `allowance-policy` (small calls, 8) | M2.23 (checks and declarations), then M2.07 (handlers) | **acme's wire changes**, see the next section |
| `ortho.config.ts`'s `auth: Auth.betterAuth(...)` and `Identity` | `examples/{acme,work}/ortho.config.ts:5,9`, `orthograph/src/modules/{config,identity}` | gone: the mount and `issues:` say it | acme's at M2.05, work's at M2.11 (each when it mounts auth); `Identity`, `AuthKit` and the `auth` key itself at M2.11, with their last reader | `AuthKit` is read by nothing (`config/types.ts:1-12`); 33 files name `Identity.` |
| the work app's `person` | `examples/work/blueprint/things/person/thing.ts` | deleted; work mounts auth | M2.11 | work's ids stay `per_`; organizations is **not** mounted (small calls, 13); no check-owned file reads work's `generated/` (`git grep -E "examples/work" -- e2e` finds only a build directory name at `e2e/m1/packages.ts:74`), so M2.11 is not a pair |
| the starter | `examples/starter/**` | replaced by Plugged In at stage 1 | M2.09, with M2.27 | `packages/preset` reads `examples/starter` (`main.ts:10`); the scaffold gate; the starter's journeys and planted fixtures are protected, so M2.27 deletes or replaces them |

## What changes on the wire

Six changes, each with the slice that makes it, who declares it first and who recaptures what the checks hash from it.
"Declares first" means the declaration the journeys import, which `builder-paths.sh` does not protect and which the author
writes with a blank handler, so a journey can compile against it.

| Change | Made by (build) | Declared first by (author) | Recaptured by (author, final commits) | Seen in |
|---|---|---|---|---|
| `cap` leaves `organization.create`'s payload and the organisation (`organization.get`) | M2.07, with its handler and `grant.ts` | M2.23 (`allowance-policy`), M2.24 (the plugin's `organization.create` has no `cap`) | M2.23 | SDK, CLI `--cap`, MCP tool, docs, portal, model, `0001_things.sql`; the three baselines; the compiler snapshot |
| `allowance-policy` and `allowance-policy.set` are new | M2.07 | M2.23 | M2.23 | every output of acme, the same files |
| `acts` joins `api-key.create`'s payload (fork 5) | M2.07 when acme mounts organizations; the credential mark is M2.05 | M2.24, in the skeleton's declaration | M2.23 | `api-key/create` in SDK, CLI, docs and API, and the model |
| `via` joins `session.show`'s answer | M2.03 in acme's own `show` and handler; M2.05 carries it into the plugin | M2.02's principal part (acme's `show.ts`), M2.24 (the skeleton) | M2.03's final commits | `session/show` in SDK, CLI, docs and API, and the model |
| the model gains a `via` on every `allowed` entry that is narrowed, and an `agentTool` on every operation | M2.03, in the compiler | M2.02's principal part: the two narrowings in acme's own declarations, `.via(Via.session, Via.device)` on `examples/acme/blueprint/things/api-key/verbs/create.ts` and `.notVia(Via.agent)` on `invitation/verbs/accept.ts` (both unprotected), so `an agent passes the owner rule` and `an agent cannot consent for a person` can pass in acme at M2.03; M2.24 writes the same narrowings in the skeleton | M2.03 (the shape, every operation, and the two narrowings) | `model.json`, the portal's `blueprint.json`, the MCP tool list; check 12's whole-model digest (`projections.ts:38-40`) and the compiler snapshot |
| `issues` replaces `identity` in every environment (Superseded by the lead's call of 21 November 2026 (see "As built in M2.03"): the examples move to `issues:` in M2.05, not M2.03.) | M2.03, in `examples/acme/blueprint/environments/*.ts` (unprotected) and the compiler | none | M2.03 | the model's `environments`; the snapshot (`acme.model.json:3749`, `:3800` say `"identity": "better-auth"`) |

## The pair map

"Pair" is G12: `goal-3/<slice>-check` opened by the checks author into `goal/stage-1`, red against today's build for the stated
reason; `goal-3/<slice>-build` branched from it, its pull request into the check branch, checked by hand with
`tools/ci/builder-paths.sh goal-3/<slice>-check goal-3/<slice>-build`; then the author's final commits, recapturing from the
real output, and one green merge into `goal/stage-1`. The whole trace of which slices are pairs is in G12.

**M2.03, with M2.02's principal part** (`goal-3/m2-03-check`)

- *Author, first commits.* acme's four principal journeys (`a key and a session are the same person`, `an agent passes the
  owner rule`, `an agent cannot consent for a person`, `the system is nobody signed in`); `session.show`'s answer `via` in
  `examples/acme/blueprint/things/session/verbs/show.ts`; the two narrowings, `.via(Via.session, Via.device)` on
  `api-key/verbs/create.ts` and `.notVia(Via.agent)` on `invitation/verbs/accept.ts`; `a service is nobody signed in` in `e2e/m2` with the adapter
  fixture. Red for the missing surface only: `.via`, `.tools()`, `lacks`, `Blueprint.system`, the `service` role, and
  `via` in the answer.
- *Builder.* (Superseded by the lead's call of 21 November 2026 (see "As built in M2.03"): the examples move to `issues:` in M2.05, not M2.03.) the runtime, `issues:` for `identity:` in acme's four environment files (`ortho.config.ts` keeps `auth` until M2.05, Smaller calls 4) and in work's; the
  other apps' environments (`examples/{starter,plugged-in,signup}/blueprint/environments/*.ts`, unprotected, with their `generated/`) drop `identity:` and write no `issues:`, the 15
  unprotected guards (the sixteenth, `examples/starter/test/fixtures/journeys/owner-step-skipped/organization/create.ts:11`,
  is a protected fixture that dies with the starter at M2.09: left alone), acme's `src/session/show.ts`
  answering `via`, `generated/`, and every package test that writes a `Principal` (`git grep -n 'kind: "person"' -- packages`
  finds 25 files).
- *Author, final commits.* the three baselines, the snapshot and `who-may-call/main.ts` (the server's `Principals.of`
  takes the door, `server.ts:125`, `:208`). The diff must show: every operation's `agentTool`, the two narrowings' `via` (and `agentTool: false` on
  `invitation/accept`), `session/show`, the
  environments' `issues`, the principal journeys' worked examples in the docs, and the server's `principals.of` lines. Nothing else.

**M2.05, with M2.25** (`goal-3/m2-05-check`)

- *Author, first commits.* delete acme's `sign-up-and-sign-in.ts` and its copy of `a key and a session are the same person`
  (both exist in the auth skeleton); repoint `invite-and-accept.ts:8`, `grant-an-allowance.ts:7`, the principal journey
  `the system is nobody signed in` and `who-may-call/main.ts:47-48` at `@orthograph/auth/blueprint/...`, and the acme journey counts the move shifts
  (`e2e/m1/00-controls.test.ts:112-113`, `e2e/layer1/02-acme-proves.test.ts:20`, `e2e/m1/29-st1-23-prove-changed.test.ts:138,268,618`). Red for one reason:
  with its copy gone and auth not mounted, the coverage eval names `PersonEmailTaken` and `SessionCredentialsWrong` as
  reached by no journey.
- *Builder.* acme's mount file `blueprint/features/auth.ts`, `auth` out of acme's `ortho.config.ts`, the `check` error for `issues` with no identity mounted (Smaller calls 4), the identity entry, the server generator, the world, the copy
  of Better Auth into `packages/auth` (the host's stays as the fallback until M2.05b), deleting acme's `person` and `session` and their handlers, `generated/`, and the package tests copied
  with Better Auth (`host-cloudflare/.../auth/auth.test.ts`, `world/world.test.ts`). Starter, plugged-in, signup and work still prove, through the host's fallback.
- *Author, final commits.* the three baselines, the snapshot and `who-may-call/main.ts`. The diff must show: the server's
  imports and the identity entry in place of `AuthD1`, `0001_things.sql`, the model's `mounts.auth` and a `from` on each of
  `person` and `session`, and the API files of those two things if they now import the plugin. Nothing else.

**M2.07, with M2.23** (`goal-3/m2-07-check`)

- *Author, first commits.* the senders and baselines of `cap` (the list is the M2.23 row of `design/milestones.md`), the
  `allowance-policy` declarations and journeys, `capped` and `funded`, the rewritten `grant-an-allowance`, acme's copies of
  the organizations journeys and its own `founded` and `invited` deleted, the retained journeys and the fixtures repointed:
  `journeys/{read-an-allowance,revoke-then-spend,grant-an-allowance,an-invitation-is-used-once,invite-and-accept,an-owner-makes-an-api-key}.ts`,
  `test/fixtures/evals/coverage/rename.ts` and `README.md` (it installs a verb into `blueprint/things/organization/`),
  `performance/grant.ts:9,21`, `who-may-call/main.ts:43-48`, the scaffold goldens `e2e/fixtures/m1/scaffold-explains/**/*.golden`
  (check 19 compares them byte for byte; `allowance-grant-created-in-active.ts.golden:4` imports `organization/roles.ts`),
  `e2e/m1/25-unique-fields.test.ts:277` (it copies acme's `organization` folder), the journey and eval counts in
  `e2e/m1/00-controls.test.ts:112-113`, `e2e/layer1/02-acme-proves.test.ts:20` and `e2e/m1/29-st1-23-prove-changed.test.ts:138,268,618`, `test/fixtures/layer2/list-read/an-owner-lists-allowances.ts:4`, and
  `examples/acme/journeys/README.md`. Red for two reasons: `organization.create` still takes `cap`, and acme does not yet
  mount organizations, so `capped` has no `founded`.
- *Builder.* the plugin's handlers, `holds` roles, acme's mount file, `allowance-policy`'s handler, `grant.ts` reading it,
  deleting acme's organizations folders and handlers, `generated/`, and the package tests: the five that send `cap`
  (`packages/prove/src/modules/portal-feed/portal-feed.test.ts:38`, `prove/call-metrics.test.ts:62`, `world/mcp.test.ts:140`,
  `world/world.test.ts:40,61`, which then call `allowance-policy/set` where they read the over-cap refusal, `world.test.ts:49`,
  `mcp.test.ts:180`), `tools/watch/replay.sh:38`, and the ones that list acme's operations, worlds or `src/` files
  (`compiler/model/model.test.ts:31,47`, `prove/impact/impact.test.ts:42-57`, `cli/brief/brief.test.ts:28`,
  `cli/generate/generate.test.ts:31`, `generators/render/render.test.ts:32`, `prove/prove/prove.test.ts:75` and `:120-125`,
  whose blank-handler line becomes `starting world founded` for the plugin's world and `starting world capped` for acme's).
- *Author, final commits.* the three baselines and the snapshot, and `who-may-call/main.ts`. The diff must show: `cap` gone,
  `allowance-policy` and its `set` added, `acts` on `api-key/create`, the narrowings now coming from the plugin (unchanged in the model), the six things as mounted.

**M2.09, with M2.27** (`goal-3/m2-09-check`): the author re-authors `e2e/layer1/01`, `layer1/06`, `e2e/layer2/05` and
`services.ts`, `e2e/m1/25` and `packages/prove/src/modules/prove/starter.test.ts` (an author's file by what it asserts), and
deletes `examples/starter/journeys/*.ts` and `examples/starter/test/fixtures/journeys/*`, which a builder may not. Red because
today's starter has `organization`, `membership`, `invitation` and `api-key` and no handles.

The package tests are not protected, so the rule is by what a test asserts. A test that uses acme's wire as seed data, or lists
acme's operations, worlds or files, is the builder's, in the build pull request. A test that asserts an author-owned fixture
(`starter.test.ts`, `prove.test.ts:103-110`) is the author's. The compiler snapshot is a recapture, so it is the author's
too, from the real output.

## Plugged In and the handles plugin: what they need, and why this does not block them

- **Plugged In's sign-in today is Better Auth already.** `Identity.testPrincipals` is a label (above); every cast member is
  signed up for real. So ST1.07 ("mounts auth: the copied identity deleted") changes who owns the sign-in code, not what
  a journey sees, exactly as `examples/plugged-in/journeys/README.md:50` hoped, though for a different reason.
- **ST1.07 is not a pair today.** `git grep -n -E "things/(person|session)" -- examples/plugged-in` finds nothing outside
  `generated/` (ST1.04 has not copied them yet). If ST1.04's journeys come to import the copies, ST1.07's author repoints those
  imports first, as M2.25 does for acme; a builder may not.
- **ST1.04 copies exactly the auth plugin's files, nothing more.** Stage 1 needs sign-up and sign-in only, so it copies
  `person`, `session`, `values/identity.ts` and their two handler folders from the starter with the same paths and no
  edits, never `organization`, `membership`, `invitation` or `api-key`. ST1.07 then deletes those folders, adds
  `blueprint/features/auth.ts`, and points the one import at the package: a deletion and a mount, no rewrite. If M2.05
  has landed when ST1.04 starts, ST1.04 mounts instead, and ST1.07 is already done; the stage's check is the same.
- **Handles refers to a person by `Blueprint.id("per")`, and imports nothing from auth.** That is what Plugged In does
  today (`examples/plugged-in/blueprint/things/handle/thing.ts:11`) and what the starter does. `per_` is the contract
  between the two plugins, documented in auth's README and checked: when auth is mounted the compiler's id-prefix check
  already refuses a second thing that claims `per`. So ST1.03 can ship `@orthograph/handles` with `needs: []` before auth
  exists; when auth lands, adding `needs: [auth]` is one line and a minor release.
- **Handles' own journeys and worlds travel with the plugin once plugin starting worlds exist (M2.22).** Until then,
  ST1.03 keeps them in the app as it does today, and nothing waits.
- **ST1.06 (hooks behind `Via.session`)** is a bearer token from `session.sign-in`, sent by the hook. Same-origin, as the
  Worker serves the screens (ST1.04), so no cross-origin setting is needed; `allowedOrigins` (M2.06) is for a dev server.
- **The stage 1 gate's last line**, "a second claim is refused `HandleTaken` through the SDK, the CLI, MCP and the hook",
  needs `signedIn` to be an agent too at the MCP step: an MCP call is an agent for the person, and `handle.claim` is
  `signedIn` with no narrowing, so the agent passes. The journey for it is M2.08's.

## Smaller calls

| # | Call | Evidence |
|---|---|---|
| 1 | **A request key is kept per caller's own id**, for every kind: `person:<id>`, `agent:<id>`, `service:<mount>`, `system`, `anonymous`. An agent's retries never answer its person's call. Closes ledger OPS-07 and the canon question at `docs/canon/operations.mdx:514-518` | `handler/service.ts:161-162` keys by person, and "anonymous" for the rest |
| 2 | **Spans carry `principal.kind` and `principal.via` on every call**, and `principal.person` on accepted calls of a person or an agent. A refused call names its kind and way in, never the person (G8) | `handler/internal/attributes.ts:17-18`; `G8-refused-span.md` |
| 3 | `Principals.of` takes the door: `{ authorization, door: "api" \| "mcp" }`; at `/mcp` every credential makes an agent | `principals/types.ts:7`; `server.ts:125`, `:208` |
| 4 | **`identity:` leaves the environment; `issues: [Via…]` replaces it.** Absent means all four. An environment that deploys `mcp` must issue `Via.agent`; one that publishes a CLI must issue `Via.device` or `Via.key`; `issues` with no identity mounted is a `check` error naming both files. That check lands with M2.05, the first slice that can mount an identity; until an app mounts auth, its `ortho.config.ts` `auth` counts as its identity (acme until M2.05, work until M2.11), and an app with neither (starter, plugged-in, signup) writes no `issues:`. Until every app mounts an identity, `host-cloudflare` keeps its Better Auth (`AuthD1`) as the world's and the server's identity for an app that mounts none (starter, plugged-in and signup, whose journeys sign people up through `/_world/cast`), and for work, whose `config.auth` is that same Better Auth until M2.11. M2.05 copies Better Auth into `packages/auth`; **M2.05b**, a builder slice of its own after ST1.07 (Plugged In mounts auth), M2.09 (the starter replaced), ST1.08 (signup deleted) and M2.11 (work mounts auth), deletes the host's copy and moves the server generator's no-identity branch to `Identity.none`, and is done when `git grep AuthD1 -- packages/host-cloudflare` finds nothing and every example proves. The host's copy has no package test of its own from M2.05 to M2.05b: the three apps' `prove` runs are its cover, accepted for a copy that only waits to be deleted. The identity entry refuses a credential of a kind the environment does not issue (it reads as anonymous) | `orthograph/src/modules/environments/types.ts:14`; ledger ENV-20; `design/docs/index.html:636` |
| 5 | **`ortho.config.ts` loses `auth`**: acme's at M2.05, work's at M2.11, and the key itself at M2.11. The project's name stays (`ENV-14`/`FOR-02`'s concern is M1.11's, not this) | `orthograph/src/modules/config/types.ts:1-12` |
| 6 | **The staging cast calls `person.sign-up` and `session.sign-in`**, the plugin's own operations, not Better Auth's routes, so `prove` knows nothing of Better Auth | `prove/src/modules/journeys/internal/world.ts:46-66` |
| 7 | **A secret is named from the mount and the export**: `secret` in the plugin mounted as `blueprint/features/auth.ts` is `AUTH_SECRET`, so the binding does not change. Mounted as `identity.ts` it would be `IDENTITY_SECRET` | `frame/secrets.md:78-81` |
| 8 | **Acme's cap becomes acme's own thing.** `allowance-policy` (`id pol_`, `organization`, `cap`), `allowance-policy.set` allowed `owner.of("organization")`, a rule `oneCapPerOrganization` (G5), and `grant` reads it with `findBy`. Acme gains a world `capped` (from `founded`: Ada sets the cap), and `funded` starts from `capped`; M2.23's author writes acme's `allowance-policy` declarations (thing, `set`, the rule) with a blank handler, its worlds and its journeys, and M2.07's builder only fills the handlers and makes them pass. The refusal `AllowanceLimitTooHigh { cap }` is unchanged | `grant.ts:13-16`; `errors.ts:7`; Plugged In's `profile.onePagePerHandle` is the same pattern |
| 9 | **`Blueprint.layer(plugin, ({ secrets, settings, db }) => …)`**: M2.04 gives the factory `settings` from the start, typed empty, so M2.06's settings need no change of signature. No entry reads `env` itself | `frame/secrets.md:86-109`; `M1-plugins.md:168-171` |
| 10 | **`/login`, `/consent` and `/device` are plain pages the auth plugin serves** (`options.ts:27`, `:49-50` already name them; nobody serves them: AUT-02). Designed versions come with the generated app | `host-cloudflare/.../options.ts` |
| 11 | **Device sessions are marked in their row** (`via: "device"`), not guessed from a header. Better Auth's hook may not see the path (AUT-03); the fallback is to mark the row after a 200 from `/api/auth/device/token` in the entry's `routes`. M2.06 settles which with a short test | `K1-kits.md:197-206` |
| 12 | **Better Auth's tables live in a declared store `auth`**, so they have a D1 binding of their own and the project never sees them (K3 item 7). `people` reads from that store, not `home` (`store/service.ts:46`, one line); the world's `reset` already handles every store (`reset.ts:29-30`) | `K3:95-97`; `store/service.ts:19-24` |
| 13 | **The work app mounts auth only.** It has no organisation: one owner per mission (`git grep organization -- examples/work` finds none). M2.11 mounts organizations only when work declares something that needs it | `examples/work/blueprint` |
| 14 | **Defaults the plugins ship:** `invitation.accept` is `invitee.notVia(Via.agent)` (joining is the person's own consent); `api-key.create` is `.via(Via.session, Via.device)`; everything else has no narrowing. An app can narrow more, never less | fork 5 |
| 15 | **`Blueprint.signedIn` admits person and agent**; a handler that needs the person uses `acting(principal)`. A typed narrowing of `principal` by the operation's `allowed` is `later.md` (the types do not keep `allowed` as a tuple today) | `operations/types.ts` |
| 16 | **Reach hides only MCP tools in M2.** CLI and SDK carry whatever credential they are given and the role check refuses the rest; K1 section 1.4's table (SDK, CLI by reach) goes to `later.md` ("SDK and CLI reach filtering") and K1 marks it superseded | `K1-kits.md:229-245`; `design/later.md` |
| 17 | **MCP lists every tool the model says an agent may call, whoever asks** (as K14's mcp card says today); who may call is said in each tool's description | `K14-the-grid.md:358` |

## Secrets, settings and the environment

```ts
// blueprint/environments/production.ts (after M2.03)
export default Blueprint.environment({
  runs: "always on",
  issues: [Via.session, Via.device, Via.agent],       // no keys here: `ak_` credentials are refused in production
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "staging",
  deploy: { server: Deploy.worker({ domain: "api.acme.dev" }), mcp: Deploy.worker({ domain: "mcp.acme.dev" }) },
});
// blueprint/environments/local.ts: `issues` absent, so all four; a world mints each for a journey
```

`AUTH_SECRET` stops being "built in": it is declared by the auth plugin (`secret`), made fresh for a world, kept by
`secrets.env` locally and set by `promote` in staging and production (`frame/secrets.md:115-139`). The built-in name in
`prove/src/modules/environments/internal/secrets.ts:12-17`, `prove/src/modules/world/service.ts:33` and
`world/types.ts:8` goes with M2.04 and M2.05.

## A plugin's own CI

**Today:** a plugin is an Nx project, so the generic job runs its `lint`, `typecheck` and `test`
(`.github/workflows/ci.yml:55`). Its journeys are judged only by a copy of it in `e2e/fixtures/m1/wallets/source`
(`e2e/m1/09-wallet-journeys.test.ts:1-8`), and by every app that mounts it. Nothing proves the plugin alone, and
`ortho ci` does not exist until M3.13.

**A · An `example/` app in every plugin, one `prove` target, one CI job** (recommended)

```jsonc
// packages/auth/project.json (and organizations, wallets): added targets and tag
"tags": ["scope:auth", "env:runtime", "layer:1", "kind:plugin"],
"prove":   { "executor": "nx:run-commands", "dependsOn": ["build"], "options": { "command": "ortho prove --root packages/auth/example --env local" } },
"closure": { "executor": "nx:run-commands", "dependsOn": ["build"], "options": { "command": "ortho check --root packages/auth/example --closure" } }
```

```yaml
# .github/workflows/ci.yml (a job beside e2e-layer1): required by tools/ci/gate.sh like the others
plugins:
  steps: [{ run: pnpm nx run-many -t build,prove,closure --projects=tag:kind:plugin --outputStyle=static }]
```

(`--closure` is a flag M2.10 adds to `ortho check`; the rule it runs is M1.09's.) What it proves, for each plugin, on every pull request that touches it:

| Step | Command | Proves |
|---|---|---|
| 1 | `lint`, `typecheck`, `test` (already) | the code |
| 2 | `build`: `tsc` to `dist` | what npm would ship compiles |
| 3 | `ortho generate`, then `ortho check` in `example/` | the example's generated code is what the blueprint gives; no blank in a published plugin (PLU-09) |
| 4 | `closure` | the descriptor and `blueprint/` import no runtime code, checked on the real import graph (M1.09's rule) |
| 5 | `ortho prove --env local` in `example/` | the plugin's own journeys and the example's, in a world made for the run, with all nine evals |
| 6 | `ortho version --next` | the next version, from the model's difference with the last published one (K2: a new operation is minor, a changed code is major) |

M2.10 adds `ortho publish --local` for a plugin and the scaffold that writes `example/`, the three targets and the
workflow. The example has no journeys of its own: it mounts the plugin, whose journeys run in the app that mounts it
(M1-plugins section 10), so M2.10's builder writes none. A plugin outside this repository gets the same steps as a workflow calling those commands directly, and M3.13's
`ortho ci` replaces them with one call. The job joins the required checks in the same change that adds it
(`CI-branch-protection.md`), and a docs-only pull request skips it like the other heavy jobs (`CI-docs-fast-path.md`).

**B · No example: a plugin is proved only by the apps that mount it** (the wallets' way): nothing runs when a plugin
changes unless an app mounts it, and an author cannot prove it before publishing.

**C · Each plugin in its own repository with its own workflow** now: premature; no plugin lives outside this repository
before M7.

### You do X → what happens

| Scenario | A · example app | B · apps only | C · own repository |
|---|---|---|---|
| Someone changes `organizations`' `invitation.accept` | the plugin's job runs its journeys alone and fails | acme's and Plugged In's `prove` fail, if they mount it | the plugin's workflow |
| A new plugin author asks "does mine work?" | `ortho new feature notes`, then the same job | needs an app first | needs a repository first |
| A plugin that imports a Node module into its declaration | `closure` fails the build | found when an app's SDK bundle breaks | as A |
| The next version | printed with the proof | printed with the app's | as A |

### Rubric

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ M2.10's "new to proved to published to mounted" is exactly this | ⚠️ | ❌ |
| Reversibility | ✅ | ✅ | ⚠️ |
| Blast radius | ⚠️ one CI job, one scaffold | ✅ | ❌ |
| Correctness / integrity | ✅ proved alone, in a world made for it | ❌ proved only in someone's app | ✅ |
| Fit | ✅ `frame/writing-a-feature.md:462-495` (step 6, the example) | ⚠️ | ⚠️ |

**Recommendation: A.**

## Plugin starting worlds, and the checks slices the trace added

**Today:** only a feature's `things/`, `journeys/` and `stores/` reach the model
(`compiler/src/modules/mounts/service.ts:65`), and `prove` loads starting worlds from the project's own folder only
(`prove/src/modules/journeys/internal/load.ts:61-65`). M2.07's row asks for worlds `founded` and `invited`, and acme's
`funded` starts `from: "founded"`.

**The call.** A plugin's `blueprint/starting-worlds/<name>.ts` is folded by the same rule as its things: the world keeps
its name when the mount has the plugin's own name, and is prefixed with the mount's name when renamed
(`M1-plugins.md:141-146`); inside the plugin, `from:` and `starts:` use the plugin's own names and the fold maps them. A
clash with the app's own world is a `check` error naming both files. An app extends a plugin's world by starting a world
of its own `from` it (acme's `capped`); there is no override.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M2.21 | Checks for plugin starting worlds, by a different agent from M2.22's builder: a fixture plugin brings a world and a journey that starts from it; an app world starts `from` the plugin's; a renamed mount prefixes it, and the plugin's `from` and `starts` follow; a clash is a `check` error naming both files; `ortho impact` stales the world's journeys when the plugin's world changes | Gate M1 | checks | they fail on today's compiler for the right reason (the folder is ignored, so a journey's `starts` names a world the model lacks); once M2.22 has folded the world and the fixture plugin's handlers are blank, each journey that starts from a plugin world reads `✘ starting world <world>: <operation> died: …BlankReached` and no step of it runs | S |
| M2.22 | The mount fold carries `starting-worlds/`; `prove` loads them with the model; names and `from` follow the mount | M2.21 | build | M2.21's checks pass; acme's `ortho prove` is unchanged | S |

**What "red on blank handlers" says about a journey that starts from a world.** A journey that starts from a plugin world is
red before its first step. The runner makes the world first, by the world's own declared calls
(`packages/prove/src/modules/journeys/service.ts:60`), and the first of them, `organization.create` for `founded`, reaches
`Handlers.blank`, which dies with `BlankReached`. The journey's line then reads, as `prove.test.ts:125` pins for acme
today:

```text
journey grant an allowance ✘ starting world founded: organization.create died: …BlankReached
```

and no step of that journey runs, so a step's own refusal or event is never judged. A world that starts `from` another reports
the failing ancestor, which is why `grant an allowance`, whose world is `funded`, names `founded`. The same line holds for every
journey below that starts from `founded`, `invited`, `joined`, `capped` or `funded`: all five reach `organization.create`
first. Only when the plugin's handlers are filled and an app's are not does the line name another call, such as
`starting world capped: allowance-policy.set died: …BlankReached` (M2.23's `capped`, before M2.07 fills its handler).
A journey with no world is different: it runs, a step that the runtime refuses before any handler passes, and the first step
that reaches a blank handler is the red one (the table in "For the checks authors" says which).

**The five checks slices the trace added.** Each is a checks slice written by a different agent from the builder it unblocks,
each is `∥` where it can run beside others, and G12 says how the three pairs land.

| id | what | why it is a slice, from the machinery |
|---|---|---|
| M2.23 | acme without `cap`: the check half of M2.07's pair | `organization.create` requires `cap` today (`create.ts:7`) and layer 1 and 2 have no ratchet, so no re-authored sender is green on both sides of M2.07 (G12). The list is in the milestones row; the owner of each file is in "The pair map". Removing the grid fixtures from the list is right: they are frozen copies (`e2e/grid/README.md:23`) |
| M2.24 | the two plugin skeletons, and the `e2e/m2` checks pointed at them | M2.05 and M2.07 would otherwise write journeys and declarations, and a builder may not write or delete a journey. Declarations are not protected, so an author may write them. The M2.02 stand-ins in `e2e/fixtures/m2/*/source/` (#267) are moved into the packages and deleted |
| M2.25 | acme mounting auth, the check half of M2.05's pair | acme's `sign-up-and-sign-in` copy, three imports of acme's `person` and `session`, and the who-may-call fixture all sit under protected paths, and deleting `person` and `session` breaks them |
| M2.26 | M2.06's journeys: `acme login`, the MCP sign-in, the page steps through `/login`, `/consent` and `/device`, and any browser step the runner needs | the journeys are protected, the runner's generic checks (`journeys/internal/checks.ts`) are author-owned, and M2.06's builder could otherwise only write them itself |
| M2.27 | the scaffold becoming Plugged In at stage 1, the check half of M2.09's pair | the starter's five journeys and three planted fixtures are protected and M2.09 replaces the starter; `layer1/01`, `06`, `layer2/05`, `m1/25` and `starter.test.ts` read it |

M2.07 needs M2.05, M2.18, M2.22, M2.23 and M2.24. ST1.03 does not wait on M2.22: its journeys stay in the app until it lands.

## For the checks authors (M2.02, M2.24, M2.25, M2.26)

M2.02 writes the journeys and the checks that fail on empty handlers; M2.24 puts them in the packages; M2.25 and M2.26 write
the rest around M2.05 and M2.06. Everything below is fixed by this record; where it says "the builder", it means the slice
that makes them pass, and a builder fills handlers and the runtime and writes no journey, world or check.

**Where things live.** M2.02's moved part is authored as stand-ins under `e2e/fixtures/m2/`, the way the wallet's were
(`e2e/m1/09-wallet-journeys.test.ts`). M2.24 moves them into the real packages and deletes the stand-ins, so there is one
copy, no builder copies a journey, and no byte-for-byte check is kept.

| What | Authored at | Then |
|---|---|---|
| the auth skeleton: `feature.ts`, `package.json`, `project.json`, `blueprint/` (acme's `person` and `session`, `values/identity.ts`, `session.show`'s `via`), `src/` with every handler `Handlers.blank` | `e2e/fixtures/m2/auth/source/` (M2.02) | `packages/auth/` by M2.24; M2.05 fills the handlers |
| the organizations skeleton, with `needs: [auth]` (its roles are today's `rule` roles, since `holds` builds in M2.18; the journeys import the exported role names, which do not change) | `e2e/fixtures/m2/organizations/source/` (M2.02) | `packages/organizations/` by M2.24; M2.07 fills the handlers |
| the plugins' journeys | the stand-ins' `blueprint/journeys/*.ts` | `packages/<plugin>/blueprint/journeys/*.ts` by M2.24, written by no builder |
| acme's principal journeys (the four in the table below, marked "acme too") | `examples/acme/journeys/` on `goal-3/m2-03-check` (M2.02's principal part) | they stay acme's until a plugin that has the same-named journey is mounted: M2.25 deletes the copy of `a key and a session are the same person`, M2.23 the other three; running twice under one name is the reason |
| the fixture app that mounts both | `e2e/fixtures/m2/app/` (`blueprint/features/auth.ts`, `organizations.ts`, projections, environments with `issues`) | none: it stays a fixture |
| the checks | `e2e/m2/NN-<name>.test.ts`, a ratchet file per check in `e2e/m2/expected-failing/` (G9, G11), targets `m2-checks`, `m2-ratchet`, `m2` and `vitest.m2*.config.ts` beside `m1`'s (`e2e/project.json:48-95`); ports from `freePorts` | after M2.24 they point at the packages, red on `BlankReached` |

**Exact spellings** (the checks and journeys use these and no others):

```ts
import { Blueprint, Via, type Allowed, type Journey, type StartingWorld, type Way } from "orthograph";

// `Way`, new in `orthograph` beside `Via` (M2.03): the narrow literal type a way in has, what Via's values are and what
// session.show answers as `via`. A journey's `expect((a) => a.via).toBe("key")` is checked against it.
export type Way = "session" | "key" | "device" | "agent";

// a way in, on a person-bound entry (signedIn, a role, role.of(path)); not on anyone, system or a service role
Blueprint.signedIn.via(Via.session, Via.device)
owner.of("organization").via(Via.session, Via.device)
invitee.notVia(Via.agent)                             // the model stores the kept list: session, key, device
// the other principals
Blueprint.system                                      // admits system only (an `allowed` entry, and a journey's cast entry)
Blueprint.role(Payment, { service: stripe })          // admits service(stripe) only (an `allowed` entry, and a cast entry)

// journeys: a cast member keeps their person; .via picks the credential the world mints for them
cast: { ada: owner, olga: Blueprint.signedIn, clock: Blueprint.system }
s.ada.run(op, payload)                                // as a person via session (the default)
s.ada.via(Via.key).run(op, payload)                   // a person's key
s.ada.via(Via.agent).run(op, payload)                 // an agent key for ada: over HTTP
s.ada.via(Via.agent).tools()                          // the /mcp catalog, called with that same key
s.clock.run(op, payload)                              // as system: a wld_ token minted for system
lacks(createKey, accept)                              // an assertion on a `.tools()` call: none of these is a tool

// the model, the claim the checks read
//   operations["api-key.create"].allowed[0].via    -> ["device", "session"] (sorted)
//   operations["invitation.accept"].allowed[0].via -> ["device", "key", "session"]
//   operations["invitation.accept"].agentTool      -> false
```

`.via(Via.device)` is left out of M2.02: the device flow moves with M2.06, and its journey (`acme login`) is written by M2.26.

**May a plugin's journeys import another plugin's operations?** Yes, through `needs`, and only its pure entries. `invite and
accept` runs auth's `session.show`, and `the system is nobody signed in` runs both plugins' operations, so the organizations
package imports `@orthograph/auth`. Three rules decide, and the second is silent:

- M1-plugins section 6 (`:173-187`): a need is another plugin's descriptor, met by the app's mount of it whatever the mount is
  named, and refused when unmet, so a journey that runs `session.show` is only ever loaded where auth is mounted.
- M1-plugins section 8, "the import rule" (`:231-236`): generated code and project code may import a mounted plugin's descriptor
  and `blueprint/*` entries everywhere and its `src/*` entries only for the host the file runs on; the closure check (M1.09)
  fails a descriptor or blueprint that reaches runtime code. It says nothing about one plugin importing another.
- `.oxlintrc.json` (both blocks, `:36-41` and `:145-150`): `env:runtime` may depend on `env:runtime`, both plugins carry that
  tag, and `scope:auth` and `scope:organizations` have no constraint block of their own. So the edge is allowed.

What that allows, and no more: `@orthograph/auth/blueprint/**` and `@orthograph/auth/feature.js` (pure), never
`@orthograph/auth/src/**`; `@orthograph/auth` listed in organizations' `package.json` next to `needs: [auth]`; the import
only in `blueprint/journeys/` and in declarations that need it. Handles refers to a person by `Blueprint.id("per")` and imports
nothing (the section on Plugged In); organizations' declarations do the same and only its journeys import auth.

**Annotations in packed plugins.** In a plugin that is built to `dist`, every journey and every starting world carries an
explicit annotation, or `tsc` stops with TS2883 (the inferred type names a type the declaration cannot name; the lead's
finding on the M2.02 stand-ins, not re-run here). The wallets are the example, `packages/wallets/blueprint/journeys/world.ts:4,16`:

```ts
import { Blueprint, type Allowed, type Journey } from "orthograph";
const journey: Journey<{ readonly holder: Allowed }> = Blueprint.journey("wallet on the world signer", { cast: { holder }, steps: ... });
export default journey;
// a starting world, the same way:
const world: StartingWorld<{ readonly ada: Allowed }> = Blueprint.startingWorld("founded", { cast: { ada: owner }, makes: ..., gives: ... });
export default world;
```

**Starting worlds** (the plugins'; names are the plugin's own, an app prefixes nothing when it mounts under the plugin's name):

| World | From | Cast | Makes | Gives |
|---|---|---|---|---|
| `founded` | none | `ada: owner` | `organization.create { name: "Acme Demo" }` (no `cap`) | `{ organization }` |
| `invited` | `founded` | `ada: owner`, `olga: signedIn` | Ada sends Olga's address an invitation | `{ organization, invitation }` |
| `joined` | `invited` | `ada: owner`, `olga: signedIn` | Olga accepts | `{ organization, membership }` |

Acme's `capped` (from `founded`; Ada sets the cap) and `funded` (from `capped`) are acme's own, authored with acme's allowance
journeys by M2.23's checks author, in the pair that moves the copies.

**The journeys.** The first three are acme's, moved, and the rows are checked against acme's files at this commit; the rest are
new. "Acme too" marks the four principal journeys that M2.02's principal part also writes in acme, for M2.03.

| Journey | Lives in | Cast and starts | Steps (each with its refusal, events and spans) | Red on blank handlers |
|---|---|---|---|---|
| `sign up and sign in` | auth | `newcomer: anyone`; no world | acme's file unchanged, with no `via` assertion (the reason is in `a key and a session are the same person`) | no world; step 1 passes, because the runtime refuses `session.show` before any handler; step 2 `person.sign-up` dies `BlankReached` |
| `an owner makes an api key` | organizations | `ada: owner`, `bob: signedIn`; `founded` | acme's file (`journeys/an-owner-makes-an-api-key.ts:13-14`); `create` takes no `cap`, so Bob's `Bob Co` is `{ name }`; Bob refused; Ada's key is `key_…`; Bob's own organisation | `✘ starting world founded: organization.create died: …BlankReached`; no step runs |
| `invite and accept` | organizations | `ada: owner`, `olga: signedIn`, `bob: signedIn`; `founded` (`invite-and-accept.ts:18-19`) | acme's file: Ada's `session.show` (auth's, through the need), Bob refused an invitation, Ada invites Olga, Bob refused the accept, Olga accepts, Bob refused her membership, Olga reads it as `member`, Ada's second invitation, Olga refused the revoke, Ada revokes | the same line as the row above; no step runs |
| `an invitation is used once` | organizations | `ada: owner`, `olga: signedIn`; `invited` (`an-invitation-is-used-once.ts:10-11`) | acme's file: Olga accepts; accepting again is refused `InvitationNotPending` (written `refuses(machine.notFrom, { state: "accepted" })`); Ada cannot revoke an accepted one | `✘ starting world founded: organization.create died: …BlankReached` (the failing ancestor of `invited`); no step runs |
| `an outsider cannot revoke an invitation` | organizations | `ada: owner`, `bob: signedIn`, `olga: signedIn`; `invited` | new: Bob refused `NotAllowed` and nothing changes; Ada revokes; Olga accepting afterwards is `InvitationNotPending`. It is not acme's `outsider-cannot-revoke`, which is about `allowance.revoke` and stays | the same ancestor line; no step runs |
| `a key and a session are the same person` (acme too) | auth | `ada: signedIn`; no world | `show` as session answers `via: "session"`; as a key answers `via: "key"` and the same person; as an agent key answers `via: "agent"` and the same person, with `principal.kind=agent` on its span. Ada holds a session token here, which is why the `via` assertions are here and not in `sign up and sign in`: prove can't carry an `anyone` newcomer's own token (`journeys/service.ts:60` sends `people[actor]?.token ?? ""`, and the staging cast gives an `anonymous` name credentials only, `journeys/internal/world.ts:53-57`) | no world; step 1 `session.show` as session dies `BlankReached` |
| `an agent passes the owner rule` (acme too) | organizations | `ada: owner`; `founded` | Ada's agent sends an invitation (passes); Ada's agent reads the organisation (passes); Ada's agent makes a key: refused `NotAllowed`, no `api-key.create` span, `api-key.create.refused` present; Ada's own session makes one; Ada's key makes one: refused | `✘ starting world founded: organization.create died: …BlankReached`; no step runs |
| `an agent cannot consent for a person` | organizations | `ada: owner`, `olga: signedIn`; `invited` | Olga's agent accepts: refused `NotAllowed`, the invitation still `pending`; `s.olga.via(Via.agent).tools()` lacks `invitation.accept` and `api-key.create` and has `invitation.send`; Olga accepts herself | the ancestor line; no step runs |
| `the system is nobody signed in` (acme too) | organizations (it calls auth's `session.show` through the need) | `clock: system`, `ada: owner`; `founded` | the system's `session.show` and `organization.create` are refused `NotAllowed`, no operation span, `.refused` present with `principal.kind=system` | `✘ starting world founded: organization.create died: …BlankReached`; no step runs |
| `a service is nobody signed in` | `e2e/m2`, not a plugin | the fixture app mounting `@fixture/remote` as `pricing`; cast `pricer: Blueprint.role(Probe, { service: pricing })`; no world | the service's call to a `signedIn` operation is refused; to its own role's operation it passes; a `service(other)` is refused there | red for the missing `service` role, not for a blank handler (the refusals are the runtime's) |

In acme, at M2.03, the four "acme too" journeys are red for the missing surface, not for blank handlers: acme's handlers are
real, and `.via`, `.tools()`, `lacks`, `Blueprint.system` and `via` in the answer do not exist.

Coverage: every refusal each operation declares is reached by some journey (the coverage eval fails an app that mounts
a plugin otherwise, `journeys/README.md` of the wallets). The author proves each check fair with the six proofs of the
`author` skill and plants wrong outputs for: a person via key let through where `.via(session, device)` says no; an agent
treated as its person; `system` admitted by `signedIn`; a `service(other)` admitted; an OAuth token accepted on HTTP;
`principal.person` written on a refused span.

**What M2.02's checks must not need that is not built.** `s.<name>.via(...)`, `.tools()`, `lacks` and the `Blueprint.system`
and `service` cast entries are M2.03's surface (journeys API in `orthograph`, the world's `/_world/credential`);
`Blueprint.layer` and `provides` are M2.04's and M2.05's; plugin starting worlds are M2.22's. Checks that need them fail
for the missing surface only, and are listed in `e2e/m2/expected-failing/` with the slice that clears each.

## Checks slices still to add (the lead's, before their builds start)

Two later build slices write behaviour that only a protected journey can prove, and no checks slice precedes them yet:
M2.13 (an agent's wallet link is refused, under `**/blueprint/journeys/**`) and M2.10 (new to proved to published to
mounted). Each gets a checks slice, numbered from M2.28, before its build starts; the lead adds the rows then, when their
needs are known. And M2.17 and M2.18: if the model's role kind moves acme's model bytes (it carries `roleRules` per thing),
that slice is a pair under G12, and its author says so in its first commit.

## What each later slice does, from this record

| Slice | Does | Done when (what changes from the table in `milestones.md`) |
|---|---|---|
| M2.03 | the five kinds and `acting`; `Narrowed`, `.via`, `.notVia`; `Blueprint.system`; the `service` role; `agentTool`; `issues:` for `identity:`; `Principals.of` with a door; the request key and span attributes; the world's `/_world/credential`; the journey API's `.via` and `.tools()`; the 15 unprotected guards; canon quotes re-quoted. A pair with M2.02's principal part | the four principal journeys of M2.02 pass in acme, `a service is nobody signed in` passes in the adapter fixture, and the pair merges green |
| M2.04 | `Blueprint.secret`, names from mount and export, `Redacted`, `Blueprint.layer(plugin, { secrets, settings, db })` | as written, and acme's `generated/` is byte for byte what it was: checks 12, 14 and 21 stay green with no baseline recaptured |
| M2.24 | the two skeletons, the plugins' journeys placed, the `e2e/m2` checks pointed at the packages | the checks fail on blank handlers only |
| M2.05 | the identity entry, `auth` out of acme's `ortho.config.ts` and the no-identity `check` error, the worker's copy of Better Auth, the `auth` store, `provides`, the server generator, the world, acme's mount, the handlers of `packages/auth`. A pair with M2.25 | the identity journeys pass with acme mounting it |
| M2.06 | device flow and its mark, OAuth for MCP, the pages, `signIn`/`keys`, settings | `acme login` and MCP sign-in journeys pass, through the real pages |
| M2.07 | the handlers of `packages/organizations`; `holds` roles; acme's `allowance-policy` handlers, so M2.23's worlds and journeys pass; `api-key`. A pair with M2.23 | the tenancy journeys pass from the plugin; acme has no `organization/` folder |
| M2.09, ST1.07 | `ortho new` writes Plugged In at stage 1 with auth and handles mounted; M2.09 is a pair with M2.27 | as written |
| M2.10 | `ortho new feature`, `example/`, the three targets, the `plugins` job, `ortho publish --local` for plugins; the example mounts the plugin and has no journeys of its own (a plugin's journeys run in the app that mounts it, M1-plugins section 10) | as written |
| M2.11 | the work app mounts auth; `auth` leaves work's `ortho.config.ts`, and `Identity` and `AuthKit` go | `ortho prove --root examples/work` passes with no copied identity |
| M2.05b | `host-cloudflare` loses `AuthD1`, its Better Auth dependencies and the world's fallback, and the server generator's no-identity branch emits `Identity.none`, after ST1.07, M2.09, ST1.08 and M2.11 | `git grep AuthD1 -- packages/host-cloudflare` finds nothing, and every example proves |
| M2.13 | SIWE linking: `challenge`, `complete`, `link` are `.notVia(Via.agent)`; `list` is open to agents | an agent's link is refused |

## Evidence

- Every `file:line` above was read at `61a7df04`, and the pair map at `b3fd9eec`. The two claims worth re-running are that
  `Identity.testPrincipals` decides nothing (`git grep -n "identity" -- packages` finds the field copied into the model and the
  portal and read by no code path) and that every cast member is a real Better Auth sign-up (`front-door.ts:20-24`,
  `service.ts:70-77`).
- The trace behind G12 and the pair map, each re-runnable: `git grep -nw cap -- . ':(exclude)design/'` and
  `git grep -n -e "--cap" -- .` (the senders: `layer1/05:35`, `layer1/06`, `layer2/support.ts:128`, `m1/14:157`, `m1/17:168`,
  `m1/24:135`, `m1/visibility-outputs.ts:45`, `packages/prove/.../portal-feed.test.ts:38`, `call-metrics.test.ts:62`,
  `mcp.test.ts:140`, `world.test.ts:40,61`, `tools/watch/replay.sh:38`, the eval fixture `performance/grant.ts:21`, and the grid's
  frozen copies); `ls e2e/layer1 e2e/layer2` (no `expected-failing`); `tools/ci/builder-paths.sh:26-36` (the protected globs);
  `git grep -n -E "things/(person|session|organization|membership|invitation|api-key)/" -- examples/acme/journeys
  examples/acme/test` (the protected files that import acme's copies); `git grep -l "examples/starter" -- e2e packages tools`.
- Not tried, and said so: minting a device-marked session in a world (AUT-03), whether Better Auth's session hook sees the
  device-token path, and the OAuth access token Better Auth's provider accepts from a world (AUT-16). Fork 2's choice
  makes the second and third needed only for M2.06's real sign-in journey, never for the principal journeys. Also not run:
  TS2883 on the M2.02 stand-ins (the lead's finding), and which bytes of acme's output each pair moves beyond the lists above:
  the author's final-commit diff states them.
- Nothing is built by this record, so no run is attached. M2.02 and M2.03 carry the proof.

## Supersedes

- design/milestones.md (M2.03): "`issues:` per environment, replacing `identity:`" → "`issues:` per environment beside `identity:` (the examples move to `issues:` in M2.05)"
- design/milestones.md (Gate M2): "scaffolds an app with auth and organizations" → "scaffolds Plugged In at stage 1 with auth and handles"
- design/frame/skills-questions.md (the quoted gate): "scaffolds an app with auth and organizations" → "scaffolds Plugged In at stage 1 with auth and handles"
- .agents/skills/kanban/data/lanes.json (M2 gate): "scaffolds an app with auth and organizations" → "scaffolds Plugged In at stage 1 with auth and handles"
- design/docs/index.html (the commands table): "a new app, with auth and organizations mounted" → "a new app, Plugged In at stage 1, with auth and handles mounted"
- design/frame/README.md (principals): "`Via.agent`: an OAuth token from the MCP sign-in" → "`Via.agent`: a credential made for an agent, such as an OAuth token from the MCP sign-in or a key made for an agent"
- design/frame/README.md (principals): "the keeper's own key, limited to time moves" → "the runtime's own work: the keeper, `on:` and workflows; it has no credential"
- design/milestones.md (M2.05) and .agents/skills/kanban/data/tasks.json: "identity: person, session, api-key" → "identity: person and session, with the key, device and agent credentials"
- design/milestones.md (M2.03): "| M2.01 | build | the principal journeys pass in acme | M |" → "| M2.01, M2.02 | build | the four principal journeys of M2.02 pass in acme, `a service is nobody signed in` passes in the adapter fixture, and the pair merges into `goal/stage-1` green after the author recaptures the baselines | M |"
- design/milestones.md (M2.07): "organisation, membership, invitation, owner and member as" → "organisation, membership, invitation, api-key, owner and member as"
- .agents/skills/kanban/data/tasks.json (M2.07): "organisation, membership, invitation, owner, member, holds, starting worlds founded and invited" → "organisation, membership, invitation, api-key, owner, member, holds, starting worlds founded, invited and joined"
- design/milestones.md (M2.12) and .agents/skills/kanban/data/tasks.json: "M2.13 to M2.20" → "M2.13 to M2.27"
- K1-kits.md: "**Every route resolves every credential kind,** so an agent's OAuth token on the HTTP API is a person `via:" → "an OAuth token (audience `/mcp`) is anonymous on the HTTP API; at `/mcp` every credential makes an agent (M2-auth fork 2)"
- K1-kits.md: "`via` is the credential, not the species." → "a key made for an agent is an agent: `via` is the credential, and `kind` says whose hands (M2-auth fork 2)"
- K1-kits.md: "reach admits `session` or `key`" → "not filtered by reach in M2; the SDK carries every operation (M2-auth small calls, 16; `later.md`)"
- K1-kits.md: "reach admits `device` or `key`" → "not filtered by reach in M2; the CLI carries every operation (M2-auth small calls, 16; `later.md`)"
- design/milestones.md (M2.11) and .agents/skills/kanban/data/tasks.json: "The work app mounts auth and organizations" → "The work app mounts auth"
- design/milestones.md (M2.11): "| M2.07 | build | `ortho prove --root examples/work` passes with no copied identity" → "| M2.05 | build | `ortho prove --root examples/work` passes with no copied identity"
- design/milestones.md (M2.02) and .agents/skills/kanban/data/tasks.json: "Journeys for both plugins, moved out of acme (sign up and in" → "Journeys for both plugins, in two parts. The moved part (#267): the journeys moved out of acme (sign up and in"
- design/milestones.md (M2.05): "| M2.03, M2.04 | build | the identity journeys pass with acme mounting it | L |" → "| M2.03, M2.04, M2.24, M2.25 | build | the identity journeys pass with acme mounting it, and the pair merges green after the author recaptures the baselines | L |"
- design/milestones.md (M2.06): "| M2.05 | build | `acme login` and MCP sign-in journeys pass | M |" → "| M2.05, M2.26 | build | `acme login` and MCP sign-in journeys pass, through the real pages, with checks 12, 14 and 21 green and no baseline recaptured | M |"
- design/milestones.md (M2.07): "| M2.05, M2.18 | build | the tenancy journeys pass from the plugin; acme has no `organization/` folder | M |" → "| M2.05, M2.18, M2.22, M2.23, M2.24 | build | the tenancy journeys pass from the plugin; acme has no `organization/` folder; the pair merges green after the author recaptures the baselines | M |"
- design/milestones.md (M2.04): "acme's environments name no secret; prove passes | M |" → "acme's environments name no secret; prove passes; acme's `generated/` is unchanged, so checks 12, 14 and 21 stay green with no baseline recaptured | M |"
- design/milestones.md (M2.09): "| M2.07, ST1.07 | build | `npm create orthograph demo`" → "| M2.07, ST1.07, M2.27 | build | `npm create orthograph demo`"

## The sign-in pages (settled 21 November 2026)

The question this section used to put to Aaron is settled by the conductor and the Goal 3 lead, 21 November 2026: plain
working pages with no design keep Aaron's interface grill intact. In M2 the auth plugin serves three plain, working
sign-in pages, with no design work. They are where a person types the code from their terminal (`/device`), where they
agree to let an agent in (`/consent`), and where they sign in before that (`/login`). Better Auth already points to them
(`options.ts:27`, `:49-50`). M2.06's MCP sign-in journey goes through these real pages, never around them to Better
Auth's API. The designed versions come with the generated app, after Aaron's interface grill.

**How the journey drives them.** M2.06's checks author writes the journey's page steps: open `/login`, sign in, land on
`/consent`, agree, and for the CLI open `/device` and type the code. If the journey runner has no browser step, M2.06's
build slice adds one, checks first. Check 21 (`e2e/m1/21-portal-viewer.test.ts`) and check 28
(`e2e/m1/28-st1-22-rules-in-the-portal.test.ts`) already drive headless Chromium through `e2e/served-portal`, and the
step reuses that.

## As built in M2.03 (21 November 2026)

What the build did that this record left open, or did differently. Nothing here changes a call above.

- **`identity:` stays beside `issues:`, optional.** `Blueprint.environment` takes `issues` and no longer requires `identity`; the model records
  each when the file says it. The examples move from `identity:` to `issues:` in M2.05, which builds identity, not in M2.03 (the lead, 21 November 2026), so #297's baselines stay still.
- **A world mints with one door.** `POST /_world/credential` takes `{ name, via }` (`session`, `key` or `agent`), `{ system: true }` or
  `{ service: "<mount>" }`. A key or an agent's key is Better Auth's own `ak_` key, the agent's marked `metadata.acts = "agent"`; the system's and
  a service's is `wld_<hex payload>.<HMAC-SHA-256 under AUTH_SECRET>`, accepted only where the server hosts worlds (`hostsWorlds`). `Via.device` has no
  world credential until M2.06 marks a device session.
- **A service role is a `role` with a `service`.** The runtime reads it against the adapter's mount by name, so the generated server hands
  `Handlers.serve` and `Reads.serve` a `mounts` map (mount object to its file's name) when some operation names a service role. The model says
  `{ kind: "role", role, service: "<mount>" }`.
- **The MCP door.** `/mcp` resolves any credential the identity knows and an OAuth access token to an agent for its person; the catalog lists an
  operation when the model says `agentTool`.
- **Not in this slice.** An agent's audience on HTTP (it never gets an issued secret) has no operation to show it yet: `api-key.create`
  refuses agents. The `acts` field of `api-key.create`'s payload is M2.07's.

## For Aaron

Nothing is open.
