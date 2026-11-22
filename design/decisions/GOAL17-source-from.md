# GOAL17-source-from: a source is a mapping on a generated adapter

Decided 22 November 2026 by the building agent (the 📐 designer thread of Goal 17, slice 2), for seam G3 in
`design/goals/17-superagent.md` ("nothing says a source is a mapping on an adapter"). It builds on K39 call 14 and K40
fixes 1 and 5. Line numbers are at `goal-17/lead-start` (`26058ff3`). Goal 11's `on:`, doors and `Inbox` are read from
`origin/goal-11/m5-01` (`design/decisions/M5-reach-out.md`, Q2 to Q4), since they are not on this branch yet.

## The problem

K39 says a connection is "a generated adapter, plus a mapping", and the brief shows the mapping (`githubSource`,
`17-superagent.md:295-305`). Nothing in the framework gives that mapping a type, a place to live, or a check. Today:

```ts
// packages/orthograph/src/modules/plugins/types.ts:92-99, :144-145
export interface AdapterSpec<C, Ca> extends Described<C> {
  readonly calls?: Ca;
  readonly events?: Readonly<Record<string, unknown>>;   // :95  untyped
  …
}
export type Adapter<C, Ca> = Omit<AdapterSpec<C, Ca>, "choices" | "calls"> & { kind: "adapter"; choices: C; calls: Ca };  // no events

// :172-177  what a mount's callback is given: calls and `include`, and no events
P extends Adapter<infer C, infer Ca> ? { choices: C; calls: Ca; choose; include: (...items: Array<Ca[keyof Ca] | unknown>) => Verb }
```

```ts
// packages/compiler/src/modules/mounts/internal/calls.ts:23-27: an included event is refused today
else if (kindOf(item) === "missing-call") problems.push(`${file}: includes the call ${…}, which ${pkg} doesn't have (…)`);
else problems.push(`${file}: include takes one of ${pkg}'s calls, written p.calls.<call> (${said}); it was given …`);
```

So a typo in `githubSource`'s `on:` (`issueComent`), or a mapping of an event the app's mount never included, would not
fail anything: `events` is `unknown`, `include` takes calls only, and `grep -rn "Blueprint.on\|catchUp" packages/*/src`
finds nothing. The brief's example also leaves out four things a source needs, which the prototype's cookbook builds in
steps 2, 4, 5 and 8: the connection's configuration, which events a connection listens to, where a reply goes, and
how to say the reply landed. If nobody decides, every source is hand-wired in a handler, and the triage agent ("made
with no new code", K39) is not possible.

## The call

**A source kind is one value, made by `Source.from(adapter, spec)`, exported from a file in the intake plugin's
`blueprint/sources/`.** It is pure data and pure functions, so the compiler can read it and the runtime can run it.

1. **It takes the adapter, not the mount.** `Source.from(github, …)`, where `github` is the adapter descriptor the
   plugin `needs` (`adapters.md`, "Adapters inside features"). The plugin cannot import the app's mount file. The
   compiler resolves the descriptor to the app's one mount of it, as `needsOf` already does for features
   (`mounts/service.ts:19, :25-26`: matched by descriptor identity, mounted once). `github.calls.*` and
   `github.events.*` are the descriptor's, so a call object is the same object `Folded.calls` keys by
   (`mounts/types.ts:45-46`).
2. **It returns a callable kind.** `githubSource({ repo, me, events })` makes a `Connection`, what
   `Superagent.declare({ connections: [...] })` lists (`17-superagent.md:228-230`). The kind is also the thing's
   static: `Source` is the intake thing and carries `from` and `timer` beside its fields, as `Superagent` carries
   `declare` (`17-superagent.md:224`).
3. **A source is active when its adapter is mounted and the mount includes any of its events.** Then everything the
   source uses must be included: a missing one is a problem naming the mount's file and the line to add. A source with
   no mount, or none of its events included, is silent (an app without Slack just has no Slack). Nothing else turns a
   source on; a superagent turns a connection on by naming it.

### The types

```ts
// plugins/intake/src/modules/source/types.ts
import type { Adapter, AdapterCall, AdapterEvent, ErrorClass } from "orthograph";
import type { Schema } from "effect";

/** What one event says about a trigger. Pure data: there is no author here (see Account, below). */
export interface Mapped<Addr> {
  readonly kind: string;                    // "comment" | "review" | "message" | …  what a connection's `events` list picks from
  readonly thread: string;                  // stable inside the source: "issue/12", "C024:1700000000.0001". Persisted: never change it
  readonly text: string;                    // untrusted; the gate never reads it
  readonly url?: string;
  readonly addressed?: "mention" | "direct";// only when the message really addresses the agent (008 step 3)
  readonly also?: ReadonlyArray<string>;    // other threads this trigger is on: Correlation, never routing (001)
  readonly channel: Addr;                   // where a reply goes: the source's own words, JSON-safe
  readonly meta?: Readonly<Record<string, string>>;
}

export interface Ctx<Cfg> { readonly config: Cfg; readonly me: AccountRef }   // the connection's own account: its events are dropped

export type EventsOf<A> = A extends { readonly events: infer E } ? E : {};      // needs Goal 11's `events` generic (below)
export type PayloadOf<E> = E extends AdapterEvent<infer P> ? P : never;

export interface SourceSpec<A extends Adapter, Cfg extends { readonly me: AccountRef }, Addr> {
  readonly config: Schema.Schema<Cfg>;                       // the connection form and its validation (008 step 2)
  readonly scope: (config: Cfg, m: Mapped<Addr>) => Scope;   // is it listened to, is it observed, which admission row (008 step 4)
  /** Keyed by the adapter's event names: a name that is not one is a type error and a problem. `undefined` ignores the event. */
  readonly on: { readonly [K in keyof EventsOf<A>]?: (e: PayloadOf<EventsOf<A>[K]>, ctx: Ctx<Cfg>) => Mapped<Addr> | undefined };
  /** Events that close a thread: answers its key, or `undefined` for "not a close". Optional: a Slack thread never closes by itself. */
  readonly closed?: { readonly [K in keyof EventsOf<A>]?: (e: PayloadOf<EventsOf<A>[K]>) => string | undefined };
  readonly reply?: Reply<A, Addr>;
  readonly history?: History<A, Addr>;
  readonly policyPart: PolicyPart<A, Cfg>;
  readonly environment: Environment<Addr>;
}

export interface Reply<A, Addr> {
  readonly call: AdapterCall;                                          // must be a call of A
  readonly args: (m: { address: Addr; text: string; key: string }) => ArgsOf<this["call"]>;   // `key` = the outgoing message's id
  readonly landed: (message: ContextMessage & { meta?: Record<string, string> }, key: string) => boolean;  // read from history: did a send that "failed" actually land?
  readonly gone: ReadonlyArray<ErrorClass>;                            // declared errors that mean "never deliverable": dropped, not retried
}
export interface History<A, Addr> {
  readonly call: AdapterCall;
  readonly args: (thread: Addr, cursor?: string) => ArgsOf<this["call"]>;
  readonly page: (answer: ResultOf<this["call"]>) => { messages: ReadonlyArray<ContextMessage>; next?: string };
}
export interface PolicyPart<A, Cfg> {                                  // this source's part of the Policy (a thing with versions, K40 fix 2)
  readonly schema: Schema.Schema<unknown>;                             // e.g. `bots`, saved inside Policy.parts[<mount>]
  readonly rows: (config: Cfg) => ReadonlyArray<AdmissionRow>;         // row ids must equal `scope`'s `row`
  readonly sync?: { call: AdapterCall; accounts: (answer: unknown) => ReadonlyArray<AccountRef> };   // collaborators, a user group
}
export interface Environment<Addr> {                                   // execution variables, no credentials (below)
  readonly variables: Readonly<Record<string, string>>;                // name → one-line description, shown in Settings even when off
  readonly of: (m: Mapped<Addr>) => Readonly<Record<string, string>>;  // exactly the declared names
}

export interface SourceKind<Cfg> {
  readonly kind: "source-kind";
  readonly adapter: Adapter | null;                                    // null: a timer
  (config: Cfg): Connection;
}
export interface SourcesApi {
  readonly from: <A extends Adapter, Cfg extends { me: AccountRef }, Addr>(adapter: A, spec: SourceSpec<A, Cfg, Addr>) => SourceKind<Cfg>;
  readonly timer: (spec: { every: string; says: string }) => SourceKind<{ every: string; says: string }>;   // no adapter; Timers wait
}
```

`config`, `scope` and `me` are the three keys beyond the brief's six. Without `config` there is no `github({ repo })`.
Without `scope` a connection hears the whole of GitHub. Without `me` the source cannot drop its own messages (001, "Drops
the bot's own messages"). `reply`, `history` and `closed` are optional (PostHog has no reply, Slack no close event).

### How each key works

| Key | Takes | What the framework does with it |
|---|---|---|
| `on` | `(event, ctx) → Mapped \| undefined`, per event name | Runs in the delivery of that event, in `trigger.receive`. Thread, text, url, kind, address and meta become the trigger. `undefined` records nothing. |
| author account | not a key: it is **not** in `Mapped` | Taken from the event's own `actor` (K40 fix 1), carried as `meta.actor`. A mapping can neither forge nor drop it. See "Account". |
| `reply` | a call, how to fill it, and how to know it landed | The outbox's send is this call as a step. `key` is the outgoing message's id, written into the call (a GitHub hidden marker, a Slack `metadata` field) so a retry cannot post twice. Before a retry the outbox reads one page of `history` and asks `landed`. An error in `gone` drops the message (008 step 5). Any other error retries 5 s doubling to 300 s. |
| `history` | a call, and how to read its answer | `eval.read` and `eval.context` page a thread through it (008 step 6), and `reply.landed` reads it. It never ingests: a poll does that (below). |
| `closed` | event name → thread key | A thread-closing event becomes `thread.closed` on that key. A merge and a close are one event with a different `action`. |
| `policyPart` | schema, admission rows, optional sync | The portal draws the source's form from `schema` and `rows`. `policy.save` validates `Policy.parts[<mount>]` by it. `sync` makes `account.list` proposals from a collaborator list or a user group. |
| `environment` | declared names, and a pure function of the trigger | See "How `environment` reaches the executor". |
| `config`, `scope` | schema; `(config, mapped) → { listened, observed, row }` | A connection is stored with its validated config. One mount serves many superagents, so each event is offered to every active connection of that mount, and `scope` picks the ones that listen. |

### One GitHub, one Slack and one PostHog source

Call names come from the generator's naming of each spec's `operationId` (GitHub's `issues/create-comment` is
`issues.createComment`). PostHog's are shown as the generator would name them; slice 4 checks them against its schema.

```ts
// plugins/intake/blueprint/sources/github.ts
import { Schema } from "effect";
import github from "@orthograph/github";
import { Source } from "../things/source/thing.ts";
import { AccountRef, mentions } from "../things/account/refs.ts";

type Addr = { repository: string; number: number };
const Config = Schema.Struct({
  repo: Schema.String, me: AccountRef,
  events: Schema.Array(Schema.Literals("issues", "comments", "reviews", "checks")),
});

export const githubSource = Source.from(github, {
  config: Config,
  scope: (c, m) => ({ listened: m.channel.repository === c.repo && c.events.includes(group(m.kind)), observed: true, row: c.repo }),
  on: {
    issueComment: (e, { me }) => ({
      kind: "comment", thread: `issue/${e.issue.number}`, text: e.comment.body, url: e.comment.html_url,
      ...(mentions(e.comment.body, me.login) ? { addressed: "mention" as const } : {}),
      channel: { repository: e.repository.full_name, number: e.issue.number },
    }),
    pullRequestReview: (e) => ({
      kind: "review", thread: `issue/${e.pull_request.number}`, text: e.review.body ?? "", url: e.review.html_url,
      channel: { repository: e.repository.full_name, number: e.pull_request.number },
    }),
  },
  closed: { pullRequest: (e) => (e.action === "closed" ? `issue/${e.pull_request.number}` : undefined) },
  reply: {
    call: github.calls.issues.createComment,
    args: (m) => ({ owner: owner(m.address), repo: name(m.address), issue_number: m.address.number, body: `${m.text}\n<!-- orthograph:${m.key} -->` }),
    landed: (message, key) => message.text.includes(`<!-- orthograph:${key} -->`),
    gone: [github.errors.NotFound],                       // issue deleted: never deliverable
  },
  history: {
    call: github.calls.issues.listComments,
    args: (a, cursor) => ({ owner: owner(a), repo: name(a), issue_number: a.number, ...(cursor ? { page: Number(cursor) } : {}) }),
    page: (r) => ({ messages: r.data.map((c) => ({ id: String(c.id), from: String(c.user?.id ?? ""), at: c.created_at, text: c.body ?? "" })), next: r.next }),
  },
  policyPart: { schema: Schema.Struct({ bots: Schema.Array(AccountRef) }), rows: (c) => [{ id: c.repo, label: c.repo, cells: observedRow }],
    sync: { call: github.calls.repos.listCollaborators, accounts: (r) => r.data.map((u) => ({ id: String(u.id), login: u.login, bot: u.type === "Bot" })) } },
  environment: {
    variables: { GITHUB_REPOSITORY: "owner/name of the repository the ticket started on", GITHUB_NUMBER: "the issue or pull request number" },
    of: (m) => ({ GITHUB_REPOSITORY: m.channel.repository, GITHUB_NUMBER: String(m.channel.number) }),
  },
});
```

```ts
// plugins/intake/blueprint/sources/slack.ts: Slack's event schemas are written by hand (slice 4), the calls are generated
type Addr = { channel: string; ts: string };                     // `ts` is the thread's root message
export const slackSource = Source.from(slack, {
  config: Schema.Struct({ me: AccountRef, channels: Schema.Array(Schema.String), directMessages: Schema.Boolean }),
  scope: (c, m) => ({ listened: c.channels.includes(m.channel.channel) || (c.directMessages && m.kind === "direct"), observed: m.kind !== "mention", row: m.channel.channel }),
  on: {
    appMention: (e) => ({ kind: "mention", thread: `${e.channel}:${e.thread_ts ?? e.ts}`, text: e.text, addressed: "mention", channel: { channel: e.channel, ts: e.thread_ts ?? e.ts } }),
    message: (e) => e.subtype !== undefined || e.bot_id !== undefined ? undefined : {
      kind: e.channel_type === "im" ? "direct" : "message", thread: `${e.channel}:${e.thread_ts ?? e.ts}`, text: e.text,
      ...(e.channel_type === "im" ? { addressed: "direct" as const } : {}), channel: { channel: e.channel, ts: e.thread_ts ?? e.ts } },
  },
  reply: {
    call: slack.calls.chat.postMessage,
    args: (m) => ({ channel: m.address.channel, thread_ts: m.address.ts, text: m.text, metadata: { event_type: "orthograph", event_payload: { key: m.key } } }),
    landed: (message, key) => message.meta?.["key"] === key,
    gone: [slack.errors.ChannelNotFound, slack.errors.IsArchived],
  },
  history: { call: slack.calls.conversations.replies, args: (a, cursor) => ({ channel: a.channel, ts: a.ts, ...(cursor ? { cursor } : {}) }),
    page: (r) => ({ messages: r.messages.map(toMessage), next: r.response_metadata?.next_cursor || undefined }) },
  policyPart: { schema: Schema.Struct({ bots: Schema.Array(AccountRef), userGroup: Schema.optional(Schema.String) }), rows: slackRows,
    sync: { call: slack.calls.usergroups.users.list, accounts: (r) => r.users.map((id) => ({ id, login: id, bot: false })) } },
  environment: { variables: { SLACK_CHANNEL: "the channel the ticket started in", SLACK_THREAD: "its thread's root timestamp" },
    of: (m) => ({ SLACK_CHANNEL: m.channel.channel, SLACK_THREAD: m.channel.ts }) },
});
```

```ts
// plugins/intake/blueprint/sources/posthog.ts: its alert webhook's payload is written once, in the adapter (K39)
type Addr = { project: string; issue: string };
export const posthogSource = Source.from(posthog, {
  config: Schema.Struct({ me: AccountRef, project: Schema.String, kinds: Schema.Array(Schema.Literals("errorIssue", "alert")) }),
  scope: (c, m) => ({ listened: m.channel.project === c.project && c.kinds.includes(m.kind as never), observed: true, row: "posthog" }),
  on: {
    errorAlert: (e) => ({ kind: "errorIssue", thread: `error/${e.issue.id}`, text: `${e.issue.name}: ${e.issue.description ?? ""}`, url: e.issue.url,
      channel: { project: e.project.id, issue: e.issue.id } }),       // no actor: the gate uses the "unnamed sender" admission cell
  },
  closed: { errorResolved: (e) => `error/${e.issue.id}` },
  history: { call: posthog.calls.errorTracking.issues.retrieve, args: (a) => ({ project_id: a.project, id: a.issue }), page: (r) => ({ messages: [toMessage(r)] }) },
  policyPart: { schema: Schema.Struct({}), rows: () => [{ id: "posthog", label: "PostHog", cells: inferredOnly }] },
  environment: { variables: { POSTHOG_PROJECT: "the project", POSTHOG_ISSUE: "the error issue" }, of: (m) => ({ POSTHOG_PROJECT: m.channel.project, POSTHOG_ISSUE: m.channel.issue }) },
});
```

`Source.timer({ every, says })` is the same kind with no adapter: each `Timers` tick calls `Inbox.accept` as `system`, with
id `timer:<connection>:<tick>` and a thread that never closes. `@orthograph/webhook` is an adapter whose events the app
writes, so its source is `Source.from(webhook, …)` like the others.

### The compiler binds the mapping to the adapter

Two layers, so a typo fails in the editor and again in `ortho check`:

- **Types.** `on` and `closed` are mapped types over `EventsOf<A>`: a key that is not an event of the adapter is an
  excess-property error, and `e` is typed by that event's schema. `reply.call`, `history.call` and `sync.call` are typed
  `A["calls"][keyof A["calls"]]`.
- **The model.** A new compiler module `sources` (six slots, beside `mounts`) reads each plugin's `blueprint/sources/`
  and reports, each naming the mount's file, as `callsOf` does (`calls.ts:25`):
  - `on` or `closed` names an event the adapter does not have (its events: …). The adapter's `events` answers a
    `MissingEvent { name }` sentinel for an unknown name, as `calls` answers `MissingCall` (`plugins/types.ts:68-72`),
    so `github.events.issueComent` is caught even where TypeScript was bypassed.
  - the source is active, and the mount does not include an event or call it uses: "`github` mounted at
    `blueprint/adapters/github.ts` does not include `events.issueComment`, which `githubSource` maps: add
    `g.include(g.events.issueComment)`".
  - a `reply`, `history` or `sync` call is not one of the adapter's calls, or a `gone` error is not one of the
    reply call's declared errors.
  - `environment.of` returns a key not in `variables`, or a name breaks the variable rules below.
  - a connection in a `Superagent.declare` names `events` that no `Mapped.kind` of the source produces. A runtime
    `superagent.create` is checked by the same schema and kind list.

Active sources then fold into the model as `sources: { github: { mount, events, calls, variables, kinds } }`. That
entry is what `impact`, the portal's Source page and the agent tools read.

### How a door and a poll both feed it

Source.from sees neither. Both end in one entry, `Inbox.accept` (M5-reach-out Q2.4), with the event's own `id` and
`actor` (K40 fixes 1 and 5):

```text
door   POST /_in/github ─ verify ─ decode with the event's schema ─┐
poll   catchUp.since(cursor) ─ the same decode ────────────────────┼─▶ Inbox.accept({ source: "github", id, event, fields, actor })
timer  Timers tick ────────────────────────────────────────────────┘     id = event.id(e)      actor = event.actor(e)
                                                                              │ seen → nothing        accepted → the outbox
                                                                              ▼
  trigger.receive   on: [Source.deliveries]   allowed: [Source.sender]    called as service(github, actor)
        map = (e, meta) → `source.on[event](e, ctx)` → payload { source, mapped, author: meta.actor, id: meta.id }
```

`Source.deliveries` and `Source.sender` are markers the compiler expands. One `Blueprint.on(mount.events.X, map)` is made
for each event of each active source, and one `{ service: mount }` role for each active mount. They have to be
expanded: `on:` naming an event no mount includes is refused (M5-reach-out Q3.4), and intake cannot list the events of
mounts an app does not have. Two things are asked of Goal 11 that its record does not say yet: `meta` carries the
event's `actor`, and `Inbox.accept` stores it in the row so a delivery after sleep still has it.

Ingestion by poll is the adapter's `catchUp` and nothing else. The prototype also polls each subscribed thread for two
weeks (`17-superagent.md:329`). Here that is `catchUp` for the whole repository, plus webhooks. See the open risks.

The outward side is expanded the same way: `Source.replies` and `Source.histories` are step markers. They give
`outgoing-message.send` and `eval.read` a record of included calls by source name, so a handler calls
`steps.reply[m.source](source.reply.args(…))` and the adapter's declared errors stay typed. A handler never imports a
service.

### Account (K40 fix 1) is resolved from it

`Mapped` has no author. The author is `meta.actor`, which the adapter's event computed (`actor: (e) => ({ id, name, bot })`)
and the door or poll stored. `trigger.receive` does four things, in order:

1. Drops the event if `author.id === config.me.id` (the source's own messages, generically, once, not per mapping).
2. For each active connection of the mount whose `scope` listens, calls `account.seen({ superagent, source: mount, id, login, bot })`.
   It makes the Account in state `seen`, or touches its login, and answers its state. No author (CI, a PostHog alert)
   means `author: null` and the gate's "unnamed sender" admission cell (008 step 3).
3. Stores the Trigger (id = `meta.id`, so a second delivery is one) with `mapped` as JSON.
4. Hands `TriggerView.author = { account, state, bot }` to the gate. The gate is pure; `listed` is the Account's state,
   not a policy list.

K40's role `listed = Blueprint.role(Account, { actor: { mount: Account.fields.source, id: Account.fields.id }, while: [listed] })`
then matches because `Account.source` holds the **mount's name** (a text field, not `Source.fields.id`). K40's example
wrote `Source.fields.id`; this record fixes it to the mount name, since a mount is what the caller carries
(`roles/types.ts:18`, `{ kind: "service"; mount }`). One mount serves several superagents, so an Account's key is
`(superagent, source, id)` and "its listed accounts are its own" holds by the row, not by the mount.

### How `environment` reaches the executor without credentials

```ts
// intake's `ticket.launch` workflow step, then the sandbox adapter's exec (K40 fixes 4 and 6)
const env = source.environment.of(trigger.mapped);        // pure, from stored data only
yield* sandbox.exec({ sandbox, command, env: { ...env, GH_TOKEN: github.lend({ … }) } })   // the only secret path is `lend`
```

- **Nothing to leak from.** `of` runs in intake's handler context with no adapter layer, and a `Secret`
  (`secrets/types.ts:2-7`) is a handle only an adapter's layer resolves. `of` is given `Mapped`, which holds `channel`
  and `meta` from the event, never config secrets.
- **Names are checked at compile time:** `^[A-Z][A-Z0-9_]*$`, starting with the source's own prefix, never ending in
  `_TOKEN`, `_KEY`, `_SECRET` or `_PASSWORD`, and never equal to a name an adapter `lend`s or declares as a secret.
- **Values are checked at run time:** at most 200 characters of `[A-Za-z0-9_./:@#-]`. Anything else is a defect on the
  launch span, so an attacker-chosen name cannot carry a newline or a quote into a prepare script.
- **Declared even when off.** `variables` appear in Settings beside the prepare command whether or not the source is
  enabled (008 step 8). A source for another service returns `""` for a ticket that did not start there.

### Where it lives, and what the compiler and generators do

`Source` and `Account` are things of `@orthograph/intake`, in `examples/superagent/plugins/intake/blueprint/things/`; the
kinds are in `plugins/intake/blueprint/sources/` (not `plugins/intake/sources/` as the brief's tree has it:
`pluginFiles` reads only the blueprint folder, `compiler/.../mounts/service.ts:65`). The pure parts, `SourceKind`,
`SourcesApi` and the scope and mention helpers, are `plugins/intake/src/modules/source/`. Per K39, they move into
Orthograph's packages once they have worked.

| | Must | Must not |
|---|---|---|
| **Compiler** | read `blueprint/sources/` of a mounted plugin (the file filter at `mounts/service.ts:65` gains `sources/`); resolve each adapter to its mount; run the checks above; fold `sources` into the model; expand the four markers; extend `callsOf` to events (Goal 11) | evaluate a mapping; know any service's name; read a secret; let an inactive source cause a problem |
| **Generators** | draw the Source page and a connection's form from `config`, `policyPart.schema` and `rows`; give each included call an agent tool (as D2:59 already does); put `sources` in the model the SDK and docs read | generate adapter calls or event types (that is M5.07); write any `github`, `slack` or `posthog` code; generate an operation per source (`github.receive` would be the second path) |
| **Runtime** | run the pure functions at delivery; make a mapping that answers a bad `Mapped` a defect of that delivery (M5-reach-out Q3.1) | catch a mapping's failure (it returns `undefined`, never throws) |

## What it touches

| Dependent | Why it cares |
|---|---|
| Goal 11 (M5.03, `catchUp`) | a typed `events` on `Adapter` and `ViewOf`; `include` of events; `Blueprint.event(…, { id, actor })`; `meta.actor`; the door's `Inbox.accept` storing the actor. This record is the first user of all of them. |
| Goal 3 (M2.03, K40 fix 1) | the `service` caller's `actor`, and the role form `actor:`. `Account.source` is the mount's name. |
| `17-superagent.md`, slice 4 | the generator emits `events` as typed values with a `MissingEvent` sentinel, and an event's `id` and `actor` slots (by hand); its conformance checks every `reply` and `history` call against the stand-in |
| Slice 7 (intake handlers) | `trigger.receive`, `account.seen`, `thread.closed` and the gate take `Mapped` and `TriggerView`; journeys call `trigger.receive` directly with a mapped payload |
| Slice 9 (agents) | `environment.of` and `lend` meet at the sandbox's `exec`; `reply` and `history` are among the included calls an executor holds as tools |
| Slice 11 (connections) | the stand-ins are driven by journeys through the same `Inbox.accept`; catch-up and thread polling are tested there |
| `@orthograph/webhook`, timer | the same `SourceKind` shape; the timer has `adapter: null` |

## Alternatives not taken

- **One operation per source** (`github.receive`, `slack.receive`). Rejected: each is new code, and the triage agent is
  to need none. It also makes the gate see four payload shapes.
- **A mapping that returns the author.** Rejected: a mapping could then name any account, and the poll and the door
  could disagree. The adapter's own `actor` is the one place (K40 fix 1).
- **`reply: github.calls.issues.createComment`, alone, as the brief has it.** Not possible: the call's arguments are the
  spec's (`owner`, `repo`, `issue_number`, `body`), not ours. Something has to fill them and carry the key.
- **The mapping in the app's blueprint.** Rejected: a second app wanting GitHub would copy it. It is the plugin's, like
  the adapter's calls are.

## Open risks

- **Thread polling.** The prototype polls each subscribed thread for two weeks past the last trigger. `catchUp.since`
  (K40 fix 5) polls a whole repository by a cursor, which covers GitHub, but not a thread no webhook reaches (CI on a
  pull request, a Slack channel the app is not in). Slice 11 decides whether `since` is also given the watched threads.
  Nothing in `Source.from` blocks either answer.
- **An id for every `on` event.** An event with no stable object id (`checks`) cannot be both a door and a poll event.
  K40 already lists this; it holds here as "every key of `on` needs an `id`", which the compiler can check once
  Goal 11's `Blueprint.event` has `id`.
- **Mapping functions are code.** A bad `thread` string is persisted forever. The compiler can't prove stability, so
  each source gets a fixture of recorded events in its journeys and a test that the same event twice gives the same
  `thread`.
- **The names the generator invents.** `reply.call` for PostHog and Slack depends on how M5.07 names an `operationId`.
  Slice 4's check pins the names a source uses, so a spec update cannot rename one silently.
- **`landed` can lie.** A hidden marker in a comment can be deleted by a person; Slack metadata is returned only to the
  app that posted it. A false `landed` drops one message; a false "not landed" posts twice. The first is chosen.
- **`events` as a connection field.** `Superagent.declare` writes `events: ["issues", "comments"]` as the connection's
  groups, which are `Mapped.kind` values, not adapter event names. The two are easy to confuse in a form.

## Evidence

- Today's code: `packages/orthograph/src/modules/plugins/types.ts:61-72` (`Call`, `MissingCall`), `:92-99`
  (`AdapterSpec`, `events` untyped at `:95`), `:144-145` (`Adapter`), `:164-177` (`ViewOf`), `:192-197` (`Mount`),
  `:199-211` (`PluginsApi`); `packages/orthograph/src/modules/roles/types.ts:14-22` (`Principal`'s service has a mount
  only, and `Acting` is a person); `packages/orthograph/src/modules/operations/types.ts:49-62` (`OperationSpec` has no
  `on`); `packages/orthograph/src/modules/secrets/types.ts:2-7` (`Secret`).
- `packages/compiler/src/modules/mounts/internal/calls.ts:16-31` (`callsOf`: an include is a call or a problem),
  `mounts/service.ts:19, :25-26, :65, :88-94` (a plugin matched by descriptor identity, mounted once, the files read, an
  adapter's fold), `mounts/types.ts:29-48` (`CallReach`, `Folded.calls`), `mounts/mounts.test.ts:93-125` (the fixture
  adapter, and the "includes a call the adapter doesn't have" message this record copies).
- `design/frame/adapters.md`, "Events coming in" and "Adapters inside features"; `design/decisions/K40-superagent-gaps.md`
  fixes 1 and 5; `design/decisions/K39-superagent.md`, call 14 and "A connection is a mount plus a mapping";
  `origin/goal-11/m5-01:design/decisions/M5-reach-out.md`, Q2.1 to Q2.4 and Q3.1 to Q3.4.
- The prototype (read as data): `docs/001-domain.md`, the Source row ("Translates each Trigger into the Threads it belongs
  to and the Channel addresses to reply on", "Drops the bot's own messages") and "Rejected concepts" (identities are never
  mapped across Sources). `docs/008-cookbook.md`, steps 2 (configuration), 3 (`webhookTrigger`: actor, `addressed`,
  `channel`, `meta`), 4 (`scope`), 5 (`channel.send`, the key, `gone`), 6 (`threadContext`), 7 (`policy`, admission
  `rows`), 8 (`environment`, "never include credentials") and 9 (cursors).

## Supersedes

The lead applied these to the brief with this record.

- `design/goals/17-superagent.md`: "sources/{github,slack,posthog,webhook,timer}.ts         each a Source.from mapping" → "blueprint/sources/{github,slack,posthog,webhook,timer}.ts   each a Source.from mapping"
- `design/goals/17-superagent.md`: "plugins/intake/sources/github.ts" → "plugins/intake/blueprint/sources/github.ts"
- `design/goals/17-superagent.md`: "reply: github.calls.issues.createComment," → "reply: { call: github.calls.issues.createComment, args, landed, gone: [github.errors.NotFound] },"
- `design/goals/17-superagent.md`: "history: github.calls.issues.listComments," → "history: { call: github.calls.issues.listComments, args, page },"
- `design/goals/17-superagent.md`: "closed: github.events.pullRequest," → "closed: { pullRequest: (e) => (e.action === "closed" ? `issue/${e.pull_request.number}` : undefined) },"
- `design/goals/17-superagent.md`: "policyPart: GithubPolicy," → "policyPart: { schema, rows, sync: { call: github.calls.repos.listCollaborators, accounts } },"
- `design/goals/17-superagent.md`: "environment: (t) => ({ GITHUB_REPOSITORY: t.repository, GITHUB_NUMBER: t.number })," → "environment: { variables, of: (m) => ({ GITHUB_REPOSITORY: m.channel.repository, GITHUB_NUMBER: String(m.channel.number) }) },"
- `design/goals/17-superagent.md`: "github({ repo: "acme/widgets", events: ["issues", "comments", "reviews", "checks"] })," → "githubSource({ repo: "acme/widgets", me: "github:<the app's bot id>", events: ["issues", "comments", "reviews", "checks"] }),"
- `design/goals/17-superagent.md`: "slack({ channels: ["#eng"], directMessages: true })," → "slackSource({ channels: ["#eng"], me: "slack:<the app's bot id>", directMessages: true }),"
- `design/goals/17-superagent.md`: "posthog({ project: "web", kinds: ["errorIssue", "alert"] })," → "posthogSource({ project: "web", kinds: ["errorIssue", "alert"] }),"
- `design/goals/17-superagent.md`: "github({ repo: "acme/widgets", events: ["issues"] })," → "githubSource({ repo: "acme/widgets", me: "github:<the app's bot id>", events: ["issues"] }),"
- `design/goals/17-superagent.md`: "slack({ channels: ["#triage"] })," → "slackSource({ channels: ["#triage"], me: "slack:<the app's bot id>" }),"
- `design/goals/17-superagent.md`: "    timer({ every: "1 week"" → "    Source.timer({ every: "1 week""
- `design/goals/17-superagent.md`: "`Source.from`, the mapping a connection adds to its adapter |" → "`Source.from`, the mapping a connection adds to its adapter, with `Source.timer` (GOAL17-source-from) |"

Dated record, kept as written, with "Superseded by GOAL17-source-from, 22 November 2026" beside it: `K40-superagent-gaps.md` fix 1, `source: Source.fields.id` becomes the mount's name plus a `superagent` field.
