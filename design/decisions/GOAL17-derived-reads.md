# GOAL17-derived-reads: one declared read that is worked out from records, never stored

Decided 22 November 2026 by the 📐 designer thread, in Goal 17 slice 2 (seam G11, "no derived read the portal and
agents share"). The building agent owns this call (`AGENTS.md`, "Who decides"); Aaron's words in K40 stand: "We don't
build things twice". It is built on `goal/superagent`, then extracted into `orthograph`, the compiler and
`language-effect` by the conductor.

Grounded at `goal-17/lead-start` (`26058ff3`), which has `origin/goal/stage-1`'s framework code, and at
`origin/goal-6/app-projection-build` (`d5aef9d3`) for Goal 6's map language. Line numbers are at those commits.

## The problem

Goal 17's pages, its generated CLI, its MCP and its agents all need four answers that no one record holds:

| Read | Answers | Why no stored field answers it |
|---|---|---|
| `ticket.stage` | one ticket's row of the stage table: who it waits for, and why | seven rows, first match wins, over the ticket's newest Report, Assignment, Attention and Inputs (prototype `003`, lines 9 to 17) |
| `ticket.waiting` | every ticket whose stage is a person's | the same table, over every ticket of one superagent |
| `superagent.health` | each source's and each channel's problems, shown after three failures in a row, and whether the superagent is paused | the counts sit on records in two plugins (Source, OutgoingMessage), and `pausedAt` on the Superagent |
| `superagent.proposals` | proposals waiting for a person | stored, but a page can't pin `state: "waiting"` (see "Proposals, named") |

Today `Blueprint.read` has two forms, and both answer from one thing's own fields:

```ts
// packages/orthograph/src/modules/operations/types.ts:116-134
export interface Read<T extends Thing = Thing, P = { readonly id: string }, A = ReadAnswer> {
  readonly kind: "read";
  readonly thing: T;
  readonly by: "id" | "list";
  /** What it answers: the fields it names (by id), or every field of the thing and its `state` (a list's items). */
  readonly fields: ReadonlyArray<string>;
  /** A list's filters: the fields a caller may narrow it by. Empty for a read by id. */
  readonly where: ReadonlyArray<string>;
```

A list read hands `where` to the store as equality tests, and its answer is the stored items:

```ts
// packages/language-effect/src/modules/handler/internal/read.ts:32-46
const listed = yield* store.list({ thing: read.thing, where: Object.fromEntries(Object.entries(filters).filter(([k]) => read.where.includes(k))),
  state, order: read.order ?? "newest", limit: read.page ?? 50, after: cursor });
const items = listed.items.map((i) => ({ ...i, state: i.state ?? "none" }));
return { items, next: listed.next } as ReadAnswer;
```

So today the stage table can only be written as an **operation** with a handler, or in each of four places by hand.
That is the tempting road, and it does work: an operation with no `move` generates a server route, SDK function, CLI
command and MCP tool (`packages/projections/src/modules/sdk/internal/sdk.ts:87`, `cli/internal/cli.ts:85`). But it
is not marked read-only, so an agent's tool for it asks for approval like a write (`language-effect/src/modules/mcp/internal/tool.ts:83`,
`readOnly: op.kind === "read"`); nothing proves it pure; and a page's `shows` would take it as an offer, not a read.

No read form is in the way on the other side: a read is already served, role-checked, cut by visibility, and
generated into the SDK, CLI and MCP:

```ts
// packages/projections/src/modules/server/internal/server.ts:112-113: one serve per read, imported by reference
o.kind === "read" ? `const ${opVar(o)}Served = Reads.serve({ name: "${o.name}", read: ${opVar(o)}.declaration${mountsOption} });`
// packages/compiler/src/modules/model/internal/describe.ts:238: and it is an agent's tool when a role admits an agent
… allowed, agentTool: admitsAgent(read.allowed), …
```

What is missing is only the middle: a way for a read to look at other records and return something they don't store.

## The call

**A derived read is today's `Blueprint.read` with a `derive:`: a pure function the read runs over a bounded set of
records, declared once and used by every read that needs it.** It is a read in every way that matters (kind, server,
SDK, CLI, MCP, agent tool, role check, visibility), so the four doors are not written again. Four new words, no new
kind of thing.

### 1. The form

```ts
// packages/orthograph/src/modules/derive/types.ts  (new module; six slots)
/** What a derive may look at, per root: records of one thing whose `by` field holds the root's id. */
export interface Look<T extends Thing = Thing> {
  readonly kind: "look";
  readonly thing: T;
  readonly by: Field;                          // a field of `thing` taken from the root's id: the compiler refuses any other
  readonly state?: string;                     // only records in this machine state
  readonly where?: { readonly [field: string]: unknown };   // equality, run in the store, as a list's
  readonly take: "newest" | "all";
  readonly max: number;                        // 1 for newest; at most this many for all (1 to 100)
}
/** A found record: its fields and its state. Order between two things is a stored `seq`, never a clock and never a rowid. */
export type Found<T extends Thing> = InstanceOf<T>;

export interface Derive<R extends Thing, L extends { readonly [name: string]: Look }, A extends FieldsInput> {
  readonly kind: "derive";
  readonly root: R;
  readonly looks: L;
  readonly adds: A;                            // the computed fields; each value names its type and who may see it
  readonly is: (root: InstanceOf<R>, found: FoundOf<L>) => TypeOfFields<A>;   // pure: values in, a value out
}
// on Blueprint: Blueprint.derive(root, spec), Blueprint.newest(thing, { by, state?, where? }), Blueprint.all(thing, { by, max, … })
```

`derive:` joins `Blueprint.read`'s two forms:

```ts
// by "id": the fields it names, plus the derive's `adds`
Blueprint.read(Ticket, { by: "id", fields: ["superagent", "title", "state"], derive: Stage, allowed: [...] });
// by "list": `where` may name a derived field (filtered after it is worked out); `only` pins a field to one value
Blueprint.read(Ticket, { where: ["superagent", "stage"], only: { stage: "person" }, derive: Stage, order: "newest", page: 50, allowed: [...] });
```

`only` is the one change for a stored list: a field the caller can't set, taken out of the payload. It also settles
proposals ("Proposals, named").

### 2. The four, as the blueprint writes them

```ts
// plugins/tickets/blueprint/things/ticket/derive.ts: the stage table, once
import { stageOf } from "../../../src/modules/stage/service.ts";      // pure, six-slot module with its own test
export const Stage = Blueprint.derive(Ticket, {
  looks: {
    report:      Blueprint.newest(Report,     { by: Report.fields.ticket }),
    assignment:  Blueprint.newest(Assignment, { by: Assignment.fields.ticket }),
    attention:   Blueprint.newest(Attention,  { by: Attention.fields.ticket, state: "open" }),
    undelivered: Blueprint.newest(Input,      { by: Input.fields.ticket, state: "failed" }),
    person:      Blueprint.newest(Input,      { by: Input.fields.ticket, where: { from: "person" } }),
  },
  adds: {
    stage: Blueprint.oneOf(["person", "working", "idle", "ended"]),
    why:   Blueprint.oneOf(["delivery", "answer", "review", "blocked", "failed", "queued", "none"]),
    label: Blueprint.text({ max: 40 }),                                // the panel's words, from the table
  },
  is: stageOf,
});
// verbs/stage.ts      one ticket's row
export default Blueprint.read(Ticket, { by: "id", fields: ["superagent", "title", "state"], derive: Stage, allowed: [Blueprint.signedIn, itsMain.of("superagent"), itsAgent] });
// verbs/waiting.ts    every ticket waiting for a person
export default Blueprint.read(Ticket, { where: ["superagent"], only: { stage: "person" }, derive: Stage, order: "newest", page: 50,
  allowed: [Blueprint.signedIn, itsMain.of("superagent")], budget: { p95: "150 millis" } });
```

```ts
// plugins/tickets/src/modules/stage/service.ts: prototype 003's table, top to bottom, first match wins
export const stageOf = (t: InstanceOf<typeof Ticket>, f: Facts): StageRow =>
  t.state !== "open"                                          ? row("ended",   "none",     "Ended")
  : f.undelivered !== undefined                               ? row("person",  "delivery", "Input undelivered")
  : f.attention !== undefined                                 ? row("person",  "answer",   "Awaiting answer")
  : f.report?.state === "ready"                               ? row("person",  "review",   "Awaiting review")
  : blockedSince(f)                                           ? row("person",  f.report!.state === "failed" ? "failed" : "blocked", "Blocked · Failed")
  : f.assignment === undefined || f.assignment.state === "pending" ? row("working", "queued", "Queued")
  : f.report?.state === "waiting" || f.assignment.state === "ended" ? row("idle",   "none",     "Waiting for a Trigger")
  :                                                              row("working", "none",     "Working");
// "no person's message since the report" compares the `seq` each record stored, never a time and never a rowid
// (a rowid counts one table, so an Input's and a Report's cannot be put in order):
const blockedSince = (f: Facts) => (f.report?.state === "blocked" || f.report?.state === "failed") && !(f.person !== undefined && f.person.seq > f.report.seq);
```

**How two tables are put in order: `seq`.** A rowid counts one table, so an Input's and a Report's cannot be compared.
Ticket gets a per-ticket sequence, bumped in the same commit as each Input and each Report, and each of those stores
the value it was given. A reply's enqueue and a head's completion bump it too, without storing it (see "Order holds"):

```ts
// plugins/tickets/blueprint/things/ticket/thing.ts, input/thing.ts, report/thing.ts
seq: Blueprint.uint(64),    // Ticket: the last number given, 0 at accept. Input and Report: the number this record was given
// input.store, ticket.report and ticket.accept: one `database` step writes Ticket.seq + 1 and the record, with that value, in the commit
```

Two writers on one ticket race on the Ticket row's version. The loser's commit conflicts and the call runs again
(`host-cloudflare/src/modules/store/internal/commit.ts:39`), reads the new `seq` and takes the next, so no two records
of one ticket share a `seq`, and a person's Input is later than a Report exactly when its `seq` is larger. The prototype
also clears "Input undelivered" on a success, a new Assignment or the Ticket's end. `undelivered` looks for the newest
Input in `failed`, which is enough: a success moves the Input to `delivered`, a retry moves a failed Input back to
`waiting` by the declared move `input.requeue` (GOAL17-executor-slots), and an ended ticket is the table's first row.

```ts
// plugins/superagent/blueprint/things/superagent/derive.ts + verbs/health.ts
export const Health = Blueprint.derive(Superagent, {
  looks: { watched: Blueprint.problems() },     // every Blueprint.problem in the app that points at this superagent, each capped at 25
  adds: { problems: Blueprint.list(Problem), more: Blueprint.bool() },   // Problem: { kind, id, name, failures }, names and ids only
  is: healthOf,                                  // keeps each watched record whose failures reached its `after`
});
// `pausedAt` is the Superagent's own field: Overview says "paused since …" from it, and health holds no count of held work
export default Blueprint.read(Superagent, { by: "id", fields: ["name", "state", "pausedAt"], derive: Health,
  allowed: [Blueprint.signedIn, itsMain], budget: { p95: "200 millis" } });

// each plugin names what can fail, beside the thing, and never imports superagent's health
// plugins/intake/blueprint/things/source/problem.ts
export default Blueprint.problem(Source, { kind: "source", of: Source.fields.superagent, name: Source.fields.name,
  failures: Source.fields.failures, after: Source.fields.failAfter /* 3 by default */ });
// plugins/tickets/blueprint/things/outgoing-message/problem.ts
export default Blueprint.problem(OutgoingMessage, { kind: "channel", of: OutgoingMessage.fields.superagent, name: OutgoingMessage.fields.id,
  failures: OutgoingMessage.fields.failures, after: 3 });
```

**Where each count lives.** A derive reads records, so every count is a field of a record. `Source.failures` counts polls
failed in a row (the brief's Source row), written in the commit of the failed poll, which returns success, and zeroed by
a success; `failAfter` is 3 by default.

**A failed send is the app's to retry, not the outbox's.** An outbox hop that fails writes nothing and is retried on
`_outbox.attempts` (`M5-reach-out.md`: a refused, failed or conflicted call writes none), so the hop itself could not
commit `failures`. So `send` catches the channel's error as a value and commits, in one commit:

```ts
// plugins/tickets/blueprint/things/outgoing-message/verbs/send.ts: a held hop of ReplyQueued; the outbox always sees a success
// on a sent message:  state "sent", failures 0, and ReplyQueued for the next pending message of the conversation
// on a `gone` error:  state "dropped" (the source's reply.gone list), and ReplyQueued for the next one
// on any other error: failures + 1, notBefore = now + backoff(failures), and a Timers wait that runs `outgoing-message.retry`
// `reply` (enqueue) and the head's `send` (complete or promote) each also bump Ticket.seq in their commit (see below)
export const backoff = (failures: bigint): bigint => (5_000n << (failures - 1n)) > 300_000n ? 300_000n : 5_000n << (failures - 1n);   // 5 s, 10 s, … 300 s
```

`retry` (system) emits `ReplyQueued` for the same message and clears `notBefore` in the same commit; it does nothing if
`notBefore` is already clear. **The `Timers` wait is only the fast path.** A crash between the failed `send`'s commit and
the arm, or a restart that drops in-memory timers, would leave a pending head with no row and no timer, blocking its
conversation. So a sweep, every 30 seconds through `Timers.at` like the seat sweep (GOAL17-executor-slots) and as counted
work, runs `outgoing-message.retry` for every `pending` message whose `notBefore` is set and has passed. A lost timer
costs at most 30 seconds. Clearing `notBefore` with the row's emission makes the timer and the sweep safe together: the
second finds it clear.

**Order holds because only the head of a conversation has an outbox row, and every change of head is guarded by one row.**
`reply` makes the message `pending` and emits `ReplyQueued` only when no earlier pending message of that ticket and
conversation exists. The head's `send` emits the next one's `ReplyQueued` in its own commit when it is `sent` or
`dropped`. Those two commits write different `OutgoingMessage` rows, so on their own neither would see the other: one
could leave a message pending with no row (it read "a head exists" while the head finished), or two replies could each
emit a head. So **both bump `Ticket.seq`** (the per-ticket sequence above) in their commits. Any two such commits on one
ticket then conflict on the Ticket row's version, the loser runs again, re-reads the conversation and decides on the
new state. No wake-up is lost and no second head appears. A duplicate `ReplyQueued` for one head is harmless: the second
`send` finds the message `sent` and meets the machine's `notFrom`. `withdraw` of a head (a retire, a ticket's end) bumps
`Ticket.seq` as well, so a `reply` that read the head cannot miss that it was dropped. The outbox orders rows per `(to, subject)`, with the
conversation as subject, so two rows of one conversation never run at once. The slice 8 journey for this runs two
replies together, and a head that sends at the same moment.

`_outbox.attempts` and its 15-attempt limit play no part in replies: a message stays until it is sent or dropped, and
health shows it from its third failure. A held `ReplyQueued` is held as before (GOAL17-pause), and a retry timer or sweep
that fires during a pause only makes a row that waits. `OutgoingMessage.failures` is a field a derive can look at; `_outbox.attempts`
is a host table it cannot, and it is the retry of every other hop, not of replies.

**What health does not hold.** No count of held work, and no outbox row: a paused superagent shows from its own
`state` and `pausedAt` (GOAL17-pause), and an operator reads held rows from `GET /_world/outbox`.

```ts
// plugins/superagent/blueprint/things/proposal/verbs/waiting.ts: a stored list, no derive
export default Blueprint.read(Proposal, { where: ["superagent"], only: { state: "waiting" }, order: "oldest", page: 25,
  allowed: [Blueprint.signedIn, itsMain.of("superagent")] });
```

### 3. Who may call it

A derived read's `allowed` is the same `Allowed` list, checked first, before anything is worked out
(`read.ts:57`, `Access.check`). `Blueprint.signedIn` admits a person on the portal, the CLI and MCP; `itsMain` is
K40 fix 3's `agent:` role, so the main agent's `tools: [ticket.waiting, superagent.health]` are checked by the real
server, as M4.07 says (`milestones.md:393`). The compiler sets `agentTool` from the same list
(`describe.ts:238`).

- A look is reached only through its `by` key from a root the caller may read. Nothing from a looked-at record leaves
  except through `adds`, and each added field carries its own visibility mark, cut by `Wire.shown` and
  `Visibility.redact` (`tool.ts:25`) like any answer field.
- Nothing from outside reaches the main agent through these reads. A row holds table words, ids, counts and names a
  person set. Never a trigger's text.

### 4. How it is worked out: a pure function over records, read at the call

`is` takes values and returns a value: no Effect, no clock, no store handle. The server runs it inside `Reads.serve`
over what the looks found, so nothing is kept and nothing can drift from the records. The compiler hashes its source
text into the read's model entry, as it does a role's `rule` (`describe.ts:116`), so changing the table changes the
read's hash and the docs say so. A lint rule holds `is` to values (the code's own rules already ban `Date.now`,
`async` and `throw`).

**Why not a view.** `Blueprint.view` (`M5.05`, `milestones.md:431`; `M5-reach-out` Q6) keeps rows in D1, built from
events, and its rows hold only fields the events carry. That makes the stage a stored copy, rebuilt from journals,
and it waits for Goal 11. It is the right tool at a scale this app doesn't have. Because `derive:` names looks and a
function, not how they run, a view can back one later with no change to a blueprint. Risk 2 is the trigger.

**No store change.** A derive needs no rank from the store. The only order it compares across tables is `seq`, a
stored field, so `Listed` stays as it is.

### 5. How it reaches the portal, CLI, MCP and an agent without being written four times

It is written once, as the read. Each door already generates from the model's `kind: "read"` entry:

| Door | How | Today, in code |
|---|---|---|
| server | `Reads.serve` runs `derive.is` | `server.ts:112` |
| SDK, then CLI | one function and one command per model operation, reads included; `ortho`'s `superagent ticket waiting` is the generated command | `sdk.ts:87`, `cli.ts:85, :125` |
| MCP | a tool, `readOnly: true`, answer cut for the agent | `tool.ts:25, :83` |
| agent tool | the same tool list, filtered by `agentTool` | `describe.ts:238`; M4.07 |
| portal page | `shows: [ticket.waiting, superagent.health, proposal.waiting]`; Goal 5's piece per read | `05-ui-layer.md:32` |

The compiler's model entry for a derived read adds what a door needs: `derive: { looks, adds, hash }`; its `answer`
already includes `adds`, so SDK types, CLI output, MCP `output` schema and docs read it from `answer` and never from
the function.

### 6. How it pages

The cursor stays what it is: the store's own `next` for the list of roots (`read.ts:27`, `CURSOR`). A derived list works
in steps, in `byList`:

1. take one store page of roots (`page` of them) with `where` (stored fields) and `state`, from `after`;
2. for each root, run its looks (store queries on `by`), then `is`; keep the rows `only` or a derived `where` accepts;
3. stop when at least one row is kept, or `scan` roots have been read (default 200, at most 1000), or the roots end.
   `next` is the store's `next` after the last page read, or null when the roots end.

So **a page may hold fewer rows than `page` and still have a `next`** when a filter such as `stage = person` rejects
most roots. A caller keeps going until `next` is null; the portal's piece loops, and the generated CLI prints `next` for the caller to pass back. A by-id derived
read never pages: its looks are capped (`max`, and `more: true` when a cap cut a list), which is why `superagent.health`
is by id, and carries at most 25 problems per watched kind.

### 7. How it stays clear of Goal 6's reads

Goal 6 declares no read. It only shows them, and its compiler check reads a shown read's **payload fields**, never its
`by`:

```ts
// origin/goal-6/app-projection-build:packages/compiler/src/modules/app/internal/checks.ts:42, :50
for (const [key, field] of Object.entries(op!.payload)) { … }
const taken = shown.some(({ op }) => Object.entries(op!.payload).some(([key, field]) => key === p || (f.ref !== undefined && field.ref === f.ref)));
```

`MAP-language.md` point 4 says `shows` and `offers` take "operations and reads". A derived read is a read with the
payload a stored one has, so Goal 6 needs no change. Overview's route supplies `superagent` (a param of
`Superagent.fields.id`): that fills `ticket.waiting`'s `superagent` field by name, and `superagent.health`'s `id` by
the same thing field (point 5, `app-route-param`).

The form we extend is Goal 6's own: **`Blueprint.read`, which Goal 6 shows, not a second read language.** Goal 6 owns
`Blueprint.page`; this record owns what a read can be. `K31`/`K36`'s `shows` stay as they are. Goal 6 hears it through an Ask issue in its milestone (K32, K33; the lead files it), so its portal doesn't build a read of its own for "tickets by stage".

### Proposals, named

The brief's `superagent.proposals` is `proposal.waiting`. A read is named `<thing>.<verb>` after the thing it is
declared on (`describe.ts:148`, "declares an operation of another thing"), and the records are Proposals. The stored
list with a pinned state needs only `only`.

## Options weighed

| | A · `derive:` on `Blueprint.read` (chosen) | B · `Blueprint.view`, kept from events | C · an operation with a handler |
|---|---|---|---|
| Floor-first | ✅ ships the read, in every door, on today's stores | ❌ waits for Goal 11's outbox and rebuild | ✅ works today |
| Reversibility | ✅ one word on a read; a view can back it later | ⚠️ a table and a rebuild to undo | ✅ |
| Blast radius | ⚠️ `orthograph`, compiler, the read handler | ❌ a new declaration, host table, CLI | ✅ none |
| Correctness | ✅ never stored, so never stale against records; pure, checkable | ⚠️ a stored copy, event-fed | ❌ not marked read-only; a handler may write; MCP asks approval |
| Parallelizable | ✅ stage, health and proposals each a file | ⚠️ | ✅ |
| Fit | ✅ reads are already served, checked, shown | ⚠️ events lack the fields | ⚠️ pages show it as an offer |

## What it touches

| Dependent | How |
|---|---|
| `packages/orthograph` | `operations/types.ts:116-166` gains `derive`, `only`; new `derive` module (`Blueprint.derive`, `newest`, `all`, `problem`, `problems`) |
| `packages/compiler` | `describe.ts:223-241` (`readModel`) records `derive`; five new refusals: a look's `by` is not the root's id, a look at an actor thing (as `describe.ts:227`), an `adds` name that is a stored field, `where` names neither, `max` outside 1 to 100 |
| `packages/language-effect` | `handler/internal/read.ts:32-56` runs looks and `is` |
| `@orthograph/tickets` | `Ticket.seq`, and `seq` on Input and Report, bumped in the commit that makes each |
| `GOAL17-pause` | `superagent.health` carries no `held` counts; `pausedAt` is read from the Superagent |
| SDK, CLI, MCP, docs | nothing written: they read the model's `answer` |
| Goal 6 (portal map) | none; its Ask (the lead files it) says "tickets by stage" is a read, not a page's own query |
| Goal 10 (agents, M4.07) | none; `toolsOf` already takes reads as MCP does |
| Goal 11 (M5.05 views) | may back a derive later |
| the brief | slices 5 to 7 and 12 name these reads; edits listed under Supersedes |

## Evidence

- Reads today: `operations/types.ts:116-134`, `operations/service.ts:25-54` (`idRead`, `listRead`), `read.ts:27-56`.
- The doors take reads already: `server.ts:112`, `sdk.ts:87`, `cli.ts:85, :125`, `tool.ts:25, :83`, `describe.ts:238`.
- A list is D1 only, in rowid order, and a conflict runs the call again: `records/types.ts:72`,
  `host-cloudflare/src/modules/store/service.ts:37-42`, `list.ts:22-25`, `store/internal/commit.ts:39`.
- Goal 6 reads payload fields only: `checks.ts:42, :50` on `origin/goal-6/app-projection-build`; `MAP-language.md` point 4.
- The prototype's own rules, read as data: stage table `docs/003-execution.md:9-17`; "each kind of work reports an error
  only after one item failed three times in a row", `:159`; a source "after three failed polls in a row by default",
  `:164`; a message with failed attempts "is a system problem until it goes out", `:183`; `ticketStage` as one pure
  function, `docs/007-architecture.md:101`; Overview's blocks, `docs/005-panel.md:19`.
- Views (the other road): `milestones.md:431`; `M5-reach-out.md` Q6 on `origin/goal-11/m5-01`, lines 233 to 264.

## Open risks

1. **A failing count must live on a record.** A derive sees things, not host tables (`Store.list`). Source and
   OutgoingMessage carry `failures`, written in the same commit as the failure and zeroed by the success. A kind of
   stored work with no record of its own (an `agent.tell` that cannot be told, a `Timers` wait) needs a counter on the
   thing it is about, or its problem can't be shown: Input's `deliveryFailed` and an Eval's `unavailable` already show
   as the stage's "Input undelivered" and on the Eval page, and slice 5 adds a `Blueprint.problem` for any more. None is
   read from the outbox.
7. **`seq` makes a ticket's records contend.** Every Input and Report writes the Ticket row, so two arriving together
   conflict once and run again. That is a cost per ticket, never across tickets.
2. **N+1.** A page of 50 tickets with five looks is up to 250 small D1 reads. The declaration doesn't change when
   the cost does: a look can take the batch's ids in one query (`whereIn`), and a view can back the read (Option B).
   `budget` and slice 6's check on 500 tickets catch it first.
3. **Not one snapshot.** Looks run as separate reads, so a row may mix two commits (an attention made between two
   looks). The row is right for the moment of its own reads, and the portal reads again on the live feed.
4. **Sparse pages.** A page can come back with few rows and a `next` (section 6). A caller that assumes "short page
   means last" would be wrong; the generated CLI and piece do not assume it.
5. **A function in a declaration.** `is` is hashed by source text, so renaming a local variable is a change to the
   read. Fine for correctness, noisy for diffs; `stageOf` and `healthOf` live in modules so the hash stays small.
6. **Input and Report state names** in the sketch (`failed`, `ready`, `from: "person"`) are the brief's words, not yet
   declared; slice 5 sets them and the stage module's test is the table.

## Supersedes

The lead applied these to the brief with this record.

- `design/goals/17-superagent.md`: "`proposals` (person: those waiting)" → "`proposal.waiting` (a read of those waiting, GOAL17-derived-reads)"
- `design/goals/17-superagent.md`: "derived read, tickets | `ticket.waiting` lists" → "derived read, tickets | `ticket.stage` reads one ticket's row of the stage table; `ticket.waiting` lists"
- `design/goals/17-superagent.md`: "superagent.operations.proposals" → "proposal.operations.waiting"
- `design/goals/17-superagent.md`: "shows: [tickets.operations.waiting," → "shows: [ticket.operations.waiting,"
- `design/goals/17-superagent.md`: "offers: [tickets.operations.stop, tickets.operations.retry," → "offers: [ticket.operations.stop, ticket.operations.retry,"
- `design/goals/17-superagent.md`: "blueprint/things/ticket/verbs/stage.ts  the stage table, a derived read" → "blueprint/things/ticket/derive.ts       the stage table, once; verbs/{stage,waiting}.ts its two reads (GOAL17-derived-reads)"
- `design/goals/17-superagent.md`: "| `Source.from`, executor slots, pause, derived reads |" → "| `Source.from` and `Source.timer`, executor slots, `Blueprint.hold` for pause, `derive:`, `only:` and `Blueprint.problem` for derived reads |"
- `design/goals/17-superagent.md`: "`Superagent.declare`, and proposals |" → "`Superagent.declare`, proposals, and slice 2's forms"
- `design/goals/17-superagent.md`: "each source's, each kind of stored work's and each channel's problems, shown once one has failed three times in a row |" → "each source's and each channel's problems (each a record's `failures` count), shown once one has failed three times in a row; a paused superagent shows from its own `pausedAt` |"
- `design/goals/17-superagent.md`: "| Source | thing, intake; `setup → ready ⇄ paused`, `error`, `off` |" → "| Source | thing, intake; `setup → ready ⇄ paused`, `error`, `off`; `failures` counts polls failed in a row and a success zeroes it, `failAfter` is 3 (GOAL17-derived-reads) |"
- `design/goals/17-superagent.md`: "| Ticket | thing, tickets; `open → ended → open`, `stopped` |" → "| Ticket | thing, tickets; `open → ended → open`, `stopped`; `seq`, a count bumped in the commit of each Input and Report, and of each reply's enqueue and completion (GOAL17-derived-reads) |"
- `design/goals/17-superagent.md`: "| Report | thing, tickets; progress, waiting, ready, blocked, failed, dropped |" → "| Report | thing, tickets; progress, waiting, ready, blocked, failed, dropped; each with `seq`, the ticket's count when it was made (GOAL17-derived-reads) |"
- `design/goals/17-superagent.md`: "| Outgoing message | thing, tickets; `pending → sent`, `dropped` |" → "| Outgoing message | thing, tickets; `pending → sent`, `dropped`; `failures` counts sends failed in a row and a sent one zeroes it; `notBefore` is when a failed one may go again (GOAL17-derived-reads) |"
- `design/goals/17-superagent.md`: "retried from 5 s doubling to 300 s, in order per ticket and conversation |" → "`send` (system, a held hop: a failed call is counted and the message queued again after 5 s doubling to 300 s through `Timers`, and the outbox sees a success); the head of a ticket's conversation holds the rest back, so order holds |"
- `design/goals/17-superagent.md`: "conversation, retried from 5 s doubling to 300 s; the eval pass and a failed relay or delivery's retries (2 s," → "conversation, its failed sends queued again by the app from 5 s doubling to 300 s (GOAL17-derived-reads); the eval pass and a failed relay or delivery's retries (2 s,"
