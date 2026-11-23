# GOAL17-stage-one: the calls slice 6's checks needed where the records were silent or disagreed

Decided 23 November 2026 by Goal 17's lead (`AGENTS.md`, "Who decides"), on the findings of slice 6's checks author (#686): the
author stopped at each place below rather than invent, and filed what it could not pin as "Gaps in the records" in
`e2e/superagent/README.md`. Each call is the smallest one that lets slice 7's handlers and slice 6's checks agree; none changes a call
of Aaron's. Evidence is at `goal-17/s6-stage-one-check`, which has `goal/superagent` at `cee9ad93` merged in.

## The calls

### 1. The twelve contract points of slice 6 stand

`e2e/superagent/README.md`, "What the builder must make, and where the checks read it (slice 6)", points 1 to 12 are ratified, with
two changes made by calls 2 and 3 below: point 5 ("addressed" is the trigger's `kind`) is replaced by call 2, and point 7's "the call's
journal holds `TriggerReceived`" is unchanged. A builder who needs one changed stops and asks the author, as before.

### 2. `trigger.receive` carries the actor and `addressed`

- **Why:** the gate needs who sent it (an account's state, whether it is a bot) and whether it addresses the agent. Slice 5's payload
  has `author` (a bare id) and no `addressed`, so a journey had to route round it through `kind` and `account.seen`
  (GAP 1 in the README). GOAL17-source-from says the actor reaches the gate (`meta.actor`) and the mapping's `addressed` is part of
  `Mapped`; neither reached the operation.
- **The payload,** with the names the connections' events use (the brief's `actor: (e) => ({ id, name, bot })`, :287):

```ts
// plugins/intake/blueprint/things/trigger/verbs/receive.ts
payload: {
  superagent, source, event, thread, kind, text, url,        // as today
  addressed: Blueprint.optional(Blueprint.oneOf(["mention", "direct"])),
  actor: Blueprint.optional(Blueprint.value(Schema.Struct({ id: Schema.String, name: Schema.String, bot: Schema.Boolean }))),   // absent: no sender (a CI result, a PostHog alert)
  channel,
}
```

  `author` goes. `trigger.receive` runs the gate first: it reads the actor's Account if one exists (an actor it has never seen is
  taken as `seen`, with no row) and hands the gate a `TriggerView` (call 8). **A filtered trigger records nothing**, no Trigger and no Account, so a stranger's
  details never reach the store; only a stored one records the Account (`account.seen`) beside its Trigger, in the same commit. The answer is
  `{ trigger?, outcome }`: `trigger` is absent when `outcome` is `filtered`. `kind` says what sort of event it was (`comment`, `message`, `mention`)
  and no longer carries "addressed".
- **Evidence:** the brief names no payload; the only line is GOAL17-source-from :348, `payload { source, mapped, author: meta.actor, id: meta.id }`, which
  this replaces. The journeys of slice 6 pass `actor` and `addressed` (`e2e/fixtures/superagent/stage-one/journeys/the-gate-lets-the-right-ones-through.ts`).

### 3. An accept makes five records in one commit; the executor is opened first

- **Why:** `ticket.accept`'s payload has `agent`, and the framework refuses an unknown one (`AgentNotFound`, in the model's `refs` and `notFound`
  of `ticket.accept`). An Agent lives in its own actor store (`packages/agents/blueprint/things/agent/thing.ts`, `lives: "actor"`), so no commit of the
  default store can hold it. "Six records in one commit" cannot be true.
- **The call:** `ticket.accept`'s one database step writes the Ticket, its Mandate, its Subscription, its first Assignment and its first Input
  (`steps.write.writes`, as built). The executor is an Agent that `agent.open` (a system operation of `@orthograph/agents`) opened first, in its own store; the
  route that accepts opens it and then calls `ticket.accept` with its id. The acknowledgement is not part of the commit: `TicketCreated`'s hop queues a reply.
- **Checkable:** `e2e/superagent/21` (exactly one database step, naming the five) and the accept journey in `22`.

### 4. `superagent.create`'s `main` is an existing Agent, and a starting world opens it first

- **The call:** `main` is a reference to an Agent that exists, as `ticket.accept`'s `agent` is. A person (or a starting world) calls `agent.open { kind: "main", about:
  "superagent/<name>" }` as the system and passes the answer. `superagent.create` opens nothing and takes **no `policy`**: the first policy is a `policy.save`
  from base 0 (revision 1). `Superagent.declare`'s `policy` is that first save, made by the same deploy that makes the create.
- **The order a starting world follows:** `agent.open`, then `superagent.create`, then `policy.save` (base 0), then `account.seen` and `account.list` for whoever may ask
  (`e2e/fixtures/superagent/stage-one/starting-worlds/`). Until `agent.open` has a handler no superagent can be made (snag #685).

### 5. The moves no operation makes

| Move | Call |
|---|---|
| Thread `queue`, `evaluate`, `release`; states `queued`, `evaluating`; events `ThreadQueued`, `ThreadEvaluating`, `ThreadReleased` | **removed from the machine and the brief.** A thread waits when it has triggers no live eval covers, and is evaluated while an eval in `queued` or `delivered` names it: both are read from the Triggers and Evals, never stored twice (the principle of GOAL17-derived-reads). Thread keeps `bind`, `closed`, `unsubscribe` and their events; its one state is `idle` |
| Eval `started` | made by `eval.start`, which exists (system) |
| Eval `expired` | **`eval.expire` (system),** a new operation of `@orthograph/intake`, one eval, `delivered` to `unavailable` |
| `eval.due` has no move | stays a move-less system operation: one pass. It calls `eval.start` for each thread with uncovered triggers and `eval.expire` for each overdue eval, as `superagent.fill` calls `assignment.started` (GOAL17-executor-slots, section 3). It answers `{ started }`; the events it makes are `EvalStarted` and `EvalExpired` of the operations it calls |

`EvalExpired` joins the held list of `pausable` as an unheld row ("rows only: an overdue eval is judged in a pause; a paused superagent's clock is moved by `pausedFor`").

### 6. A closing Assignment is "Stopping", and nobody is waited for

`stageOf` has one new row, between `queued` and `waiting`: an open ticket whose Assignment is `closing` is `stage: "working"`, `why: "none"`, `label: "Stopping"`.
A question, a ready report, a block or an undelivered input above it still win; the row is below them in the table. `e2e/superagent/20` pins it.

### 7. `off` mode with a listed bot: the prototype's 002 is the rule

The prototype's `docs/002-authorization.md` (read on 23 November 2026 as data), "Accept mode and rules": `off` means nothing inferred becomes a candidate, "such as an
unaddressed message, a bot's message or the follow-up of a person not on the list"; and "Strength": "not admitted" includes "every inferred case while the accept
mode is `off`". Explicit requests work in every mode. So in `off` the gate admits a listed person's addressed message, a stranger's addressed message where the row's
`unlisted` cell is `explicit`, and nothing else; in `observe` and `auto` it also admits what is inferred. The gate does not record "would accept": that is the main
agent's decision in `observe` (the brief, "The gate, then the main agent"). `e2e/superagent/19`'s gate journey judges each cell by outcome; `23` judges the pure table.

### 8. `Gate.of`'s views, as the gate cells read them

```ts
// plugins/intake/src/modules/gate/types.ts: pure. The module exports `gate: Gate` from service.ts, as `slots` and `stageOf` are
export type Strength = "explicit" | "inferred" | "none";                                  // as the brief has it
export interface Account { readonly state: "seen" | "listed" | "unlisted"; readonly bot: boolean; readonly external: string }   // `external`: the outside id, as `policy.bots` lists it
export interface TriggerView {
  readonly addressed: "mention" | "direct" | undefined;                                    // the payload's, from the mapping
  readonly author: Account | null;                                                        // null: no sender
  readonly row: string;                                                                   // the admission row, from the source's `scope`
  readonly observed: boolean;                                                             // the source receives every message there (`scope.observed`)
}
export interface ThreadView { readonly key: string }                                      // the thread's own; the gate reads only the tickets below
export interface TicketView {                                                             // one ticket that has the thread, as its subscription says
  readonly state: "open" | "ended" | "stopped";
  readonly mode: "own" | "attached" | "context" | "bound";                                // `context` grants no follow-up strength
  readonly stoppedBy: "person" | undefined;                                               // a stop by a person ends follow-up for good
}
export interface PolicyView {
  readonly mode: "off" | "observe" | "auto";
  readonly bots: ReadonlySet<string>;                                                     // this source's bot list, outside ids
  readonly admission: Readonly<Record<string, Partial<Record<"listed" | "unlisted" | "unnamed", Strength>>>>;   // by row; an unset cell is its default
}
```

The admission row's three cells are the prototype's three (`002`, "Admission"): `listed` is on the list and not addressing, `unlisted` is not on the list and addressing,
`unnamed` is not on the list and not addressing (or has no sender). Their defaults are `inferred`, `none`, `none`; a service with no sender (PostHog) sets `unnamed:
"inferred"`. This **corrects `observedRow`** (GOAL17-source-from, "Source.from's shared helpers": `{ listed: "explicit", ... }`) to `{ listed: "inferred", unlisted: "none",
unnamed: "none" }`: a person's plain message is inferred, never explicit, in the prototype. Slice 7 changes `plugins/intake/src/modules/source/types.ts`.

The table, top first, first match wins (a trigger and its context in, a strength and a basis out):

| # | Case | Strength | Basis |
|---|---|---|---|
| 1 | a bot (`author.bot`) on `policy.bots` that addresses the agent, or on an `observed` row | `inferred` | `bot` |
| 2 | any other bot | `none` | `bot` |
| 3 | a listed person who addresses the agent | `explicit` | `addressed` |
| 4 | a person (listed or not) on a thread an `open` or `ended` ticket owns (`own`, `attached`, `bound`), not stopped by a person: listed `explicit`, else `inferred`, unless the row's `unlisted` cell is `explicit` | as said | `followup` |
| 5 | not listed, addressing: the row's `unlisted` cell | the cell | `admission` |
| 6 | listed, not addressing, on an `observed` row: the row's `listed` cell | the cell | `admission` |
| 7 | not listed or no sender, not addressing, on an `observed` row: the row's `unnamed` cell | the cell | `admission` |
| 8 | anything else | `none` | `admission` |

Then `mode === "off"` turns every `inferred` into `none`. `ThreadView` carries nothing the table reads beyond the tickets; it is kept because the brief's `Gate.of` takes it.

### 9. `versions:` is served by the framework, in slice 7

K40 fix 2 says `policy.save`, `get`, `history` and `restore` are generated for a thing with `versions:`. Slice 5 declared the forms and wrote four blank handlers; `policy.restore`
has a move from `current` and no row to move. The call: **the framework serves `versions:` in slice 7** (`packages/orthograph`, the compiler and `language-effect`): it generates
the four operations' behaviour (a stale save refused with `StaleRevision { current }`, every version kept, history by number) and the plugin's four verbs are what it generates
from; slice 7's builder deletes the four blank handlers and the verbs' own move. The same serves `prompt-set` and `superagent.update`. Snag #685 closes with it.

### 10. An explicit request makes its ticket in every mode; only an inferred accept is recorded in `observe`

The prototype's `002` ("Accept mode and rules"): explicit requests work in every mode, and in `observe` a positive assessment of an *inferred* candidate is recorded
as ignore marked "would accept" while nothing is accepted. The brief's "In `observe` an accept is recorded as "would accept"" was too wide, and said so of every accept;
it now says "an inferred accept". The main agent's `decision.route` records an explicit accept as an accept in every mode and an inferred one as "would accept" in
`observe`. Slice 7's builder changes `decision.route`'s description in `examples/superagent/plugins/intake/blueprint/things/decision/verbs/route.ts` (it still says
"In observe an accept is only recorded"); the checks do not read it. `22`'s observe journey uses an inferred candidate (a message with no sender in a row whose `unnamed` cell is inferred).

### 11. The shapes `22` keeps where no record gave one

- **`decision.route`'s items** are `{ action: "accept" | "attach" | "stop" | "ignore", trigger, title? }`, and the tool call carries the `eval` it answers: `{ eval, items }`
  (the operation's payload, as built). A scripted turn cannot know the eval's id when the script is written, so `ModelTurn`'s `args` may name it as the string `"$eval"`, which
  the stand-in fills with the id of the eval its request was told: **an addition to GOAL17-check-harness's `ModelTurn`, asked of slice 9's builder.**
- **A ticket's id** is the `subject` of its `TicketCreated` outbox row (`OutboxRow.subject`, "ordered by the ticket"): the journeys read it from `outbox.rows`.
- **"The Agent's turn is closed"** is `AgentClosed` delivered to `assignment.turn-ended` (`outbox.rows({ name: "AgentClosed", to: "op:assignment.turn-ended" })`), not a row of `agent.close`.
- **`AssignmentEnded` has two deliveries** (`superagent.fill` and `input.route`), so a journey that counts it names `to: "op:superagent.fill"`.
- **The `actor:` cast form** names the world's listed account: `cast: { ann: listed }` is the account the starting world listed (`U1`); how the world binds it is the door's, built with the cast form.

### 12. What proving 19 on a throwaway found (the framework, not the checks)

Run on a throwaway app (`SUPERAGENT_APP`, handlers and blueprint edits written only for the proof), all six journeys of `19` pass. Getting there hit five framework limits that
slice 7 must fix in `packages/`, since the blueprint cannot work round them:

| Limit | Seen as | Fix, in slice 7 |
|---|---|---|
| `prove`'s facts door cannot read a thing that lives as an actor | `agent.open` in a starting world: `/_world/facts/record` answers 500 | facts for `lives: "actor"` (Goal 3's `prove`, Goal 10's Agent) |
| `Blueprint.optional(...)` makes a `NOT NULL` column | any insert that leaves one out fails (`Agent.current`, `Superagent.pausedAt`, `Trigger.url`) | the migration makes an optional field nullable (`host-cloudflare`, the generator) |
| `Blueprint.bool()` does not round-trip in D1 | `account.list` on an account whose `bot` is stored: "Expected boolean" | the store decodes 0 and 1 as a boolean |
| `Blueprint.value(Schema.Unknown)` is not stored as JSON | `policy.save` with `admission: {}`: D1 "Type 'object' not supported" | store `Unknown` as JSON, or type those fields (`Policy.admission`, `rules`, `Trigger.channel`, `Decision.items`, `Source.config`) |
| a read of a missing id answers `NotAllowed`, never "not found" | `ticket.stage` of an unknown ticket | none: the journey says `NotAllowed` |

Snag #685 gains the first four. The proof also showed that `trigger.receive`'s answer needs `trigger` optional (call 2) and that `eval.due` needs no move to count (call 5).

## What it makes checkable

`19` (the gate journey now has 27 steps over the payload of call 2 and the cells of calls 7 and 8), `20` (the closing row), `21` (five records), and the new `22` (the doors) and
`23` (the pure gate table, `gate` from `plugins/intake/src/modules/gate/service.ts`).

## Supersedes

- `design/goals/17-superagent.md`: "// its main agent, made by create (K40 fix 3)" → "// its main agent: an existing Agent, opened first by `agent.open` (GOAL17-stage-one)"
- `design/goals/17-superagent.md`: "// opens its main agent" → "// takes the main agent a person opened first"
- `design/goals/17-superagent.md`: "`idle → queued → evaluating`, one eval at a time" → "`idle`; whether it waits or is being evaluated is read from its triggers and evals, one eval at a time (GOAL17-stage-one)"
- `design/goals/17-superagent.md`: "not re-armed while the superagent is paused); `delivered` (system);" → "not re-armed while the superagent is paused); `start`, `expire`, `delivered` (system);"
- `design/goals/17-superagent.md`: "`receive` (source; stored, duplicate or filtered, idempotent by source and event)" → "`receive` (source: `{ superagent, source, event, thread, kind, text, url, addressed, actor, channel }`, the actor `{ id, name, bot }` or none; stored, duplicate or filtered, idempotent by source and event)"
- `design/goals/17-superagent.md`: "the Mandate, Ticket, Subscription, Assignment, Input and executor in one commit" → "the Mandate, Ticket, Subscription, Assignment and Input in one commit, its executor opened first by `agent.open`"
- `design/goals/17-superagent.md`: "An accept makes the Ticket, its Mandate, its Subscriptions, its first Assignment, its" → "An accept makes the Ticket, its Mandate, its Subscriptions, its first Assignment and its"
- `design/goals/17-superagent.md`: "`superagent.create` makes the main agent; `ticket.accept` makes the ticket's executor (K40 fix 3: making an agent is an" → "`superagent.create` takes a main agent a person opened first; `ticket.accept` takes the ticket's executor, opened first (K40 fix 3:"
- `design/goals/17-superagent.md`: "an accept making all six records in one commit" → "an accept making its five records in one commit"
- `design/goals/17-superagent.md`: "its acknowledgement follows as a reply. In `observe` an accept is recorded as" → "its acknowledgement follows as a reply. An explicit request makes its ticket in every mode; in `observe` an inferred accept is recorded as"
- `design/decisions/GOAL17-source-from.md`: "payload { source, mapped, author: meta.actor, id: meta.id }" → "payload { superagent, source, event: meta.id, thread, kind, text, url, addressed, actor: meta.actor, channel }"
