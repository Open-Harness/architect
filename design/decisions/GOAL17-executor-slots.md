# GOAL17-executor-slots: a pool of seats, one kept for a person, held by rows that nothing has to count

Decided 22 November 2026 by Goal 17's lead, in the 📐 designer thread for seam G6 (`design/goals/17-superagent.md:554`).
It needs no call from Aaron: it is this goal's own design (K39, slice 2) and changes no call of his. Grounded at
`goal-17/lead-start` `26058ff3`. Line numbers are at that commit.

## The problem

A superagent may have many tickets open, each with an executor that can run a model and a sandbox. The brief gives the
pool a size and nothing else:

```ts
// design/goals/17-superagent.md:199
slots: Blueprint.uint(8),
// design/goals/17-superagent.md:388, in the executor's declaration
slots: superagent.slots,                      // this goal's design: a pool, plus one kept for a person's message
// design/goals/17-superagent.md:330, the whole of Assignment's row in the spec table
| Assignment | thing, tickets; `pending → running → ended` | `started`, `interrupted`, `turnEnded` (system) |
```

The prototype's rule (`003-execution.md:55-61`, read as data) is: a ticket holds a slot from the start of a launch, or
from the delivery that wakes its idle executor, and through every active turn. The limit has one extra slot for a
person's message; a person's wake may use it when the others are full, and takes the next free slot before a new
launch. Other inputs, such as CI results, wait for a normal slot. A handoff to a person frees the slot at once
(`:37`); background work keeps it, for at most 30 minutes (`:33-35`).

If nobody decides how this is built, the first version counts running executors in a variable. A restart then loses the
count (a leaked seat that never frees, or two executors in one seat), and a full pool can't answer a person.

Nothing in the framework today counts or caps anything. What exists is what a store does at commit: a version guard, a
unique rule, and one commit for the writes, the journal and the outbox (K3-stores-and-sources.md:29;
`packages/language-effect/src/modules/records/types.ts:33-41`).

## The call

**A seat is a number on a row. There is no counter.** The pool is `slots` seats, numbered 1 to `slots`, and one more
seat, the reserve, numbered 255. An Assignment holds a seat exactly while it is `running`, and the store's own unique
rule makes two holders of one seat impossible. How many are running is read from the rows; nothing stores it, so
nothing can drift.

### 1. The declaration a blueprint writes

```ts
// plugins/superagent: what the blueprint writes is only the size. `uint(8)` is 0 to 255 (values/types.ts:37, a bigint in code).
export const Superagent = Blueprint.thing({
  fields: { /* … */ slots: Blueprint.uint(8) /* 1 to 254: superagent.create and update refuse 0 and 255 (SlotsOutOfRange) */ },
});

// plugins/tickets/blueprint/things/assignment/thing.ts
export const Assignment = Blueprint.thing({
  description: "One stretch of a ticket's executor holding a seat: it waits, runs, ends.",
  fields: {
    id: Blueprint.id("asg"),
    superagent: Blueprint.id("sag"),              // a reference: "sag" is Superagent.fields.id's prefix, owned by superagent; the compiler refuses a prefix that names no thing's own id
    ticket: Ticket.fields.id,
    agent: Agent.fields.id,                       // the ticket's executor (K40 fix 3)
    input: Input.fields.id,                       // the Input that woke it (accept's first, a person's, a CI result): told when the seat comes
    why: Blueprint.oneOf(["launch", "person", "input"]),   // who is waiting: the order and the reserve read this
    seat: Blueprint.uint(8),                      // 0 until it starts; 1 to 254 the pool; 255 the reserve
  },
});

// .../assignment/machine.ts: the brief's three states and moves, plus the one that makes it
export const machine = Blueprint.machine(Assignment, {
  states: ["pending", "running", "closing", "ended"],
  moves: {
    queued:      { from: [],                      to: "pending", emits: AssignmentQueued },
    promoted:    { from: ["pending"],             to: "pending", emits: AssignmentPromoted },    // a person's Input arrived: why becomes "person"
    started:     { from: ["pending"],             to: "running", emits: AssignmentStarted },
    cancelled:   { from: ["pending"],             to: "ended",   emits: AssignmentEnded },       // never seated, never told: nothing to fence
    interrupted: { from: ["running"],             to: "closing", emits: AssignmentInterrupted },  // a stop, a retire or reap: still holds its seat
    turnEnded:   { from: ["running", "closing"],  to: "ended",   emits: AssignmentEnded },       // the Agent acknowledged this id: it idled on it, or closed it
  },
  notFrom: { exit: 2 },
});

// .../assignment/invariants.ts: the two rules that make the count honest
export const oneHolderPerSeat = Blueprint.invariant.unique(
  [Assignment.fields.superagent, Assignment.fields.seat],
  { while: [machine.states.running, machine.states.closing], refuse: SeatTaken },     // a closing Assignment still holds its seat
);
export const oneLivePerExecutor = Blueprint.invariant.unique(
  Assignment.fields.agent,
  { while: [machine.states.pending, machine.states.running, machine.states.closing], refuse: ExecutorAlreadyQueued },
);

// the executor's declaration (brief :388) says which thing holds its seats, and where the size is
export default Blueprint.agent({ /* … */ slots: { size: superagent.slots, reserve: 1, held: Assignment } });
// Superseded by GOAL17-slice5-forms, call 15, 23 November 2026: `@orthograph/superagent` declares `held: Blueprint.id("asg")`, the id the
// Assignment owns, so the plugin imports nothing of `tickets`; the compiler resolves the prefix to the one thing that owns it.
```

These forms exist today: a composite `unique` with `while` (`packages/orthograph/src/modules/invariants/types.ts:26-30`,
`:51-55`), compiled to one partial unique index per rule (`packages/projections/src/modules/server/internal/worker-config.ts:66-68`,
"over the rule's key, within its `while` states"). `Blueprint.oneOf`, `Blueprint.agent` and its `slots:` are the
brief's proposals (slice 5). `seat` is `0` and not empty because every field is a `NOT NULL` column
(`worker-config.ts:60`); the seat index covers only `running` and `closing` rows, so a `0` is never compared.

**A seat is freed only after the Agent has acknowledged that Assignment id, either by idling on it or by closing it. Never
before.** The `interrupted` move is the brief's own name. It does **not** end a running Assignment: it moves it to `closing`,
which still holds its seat, and emits `AssignmentInterrupted`. Its unheld `agent.close` hop fences the opening tell in the
Agent's own commit (section 5), and the Agent then emits `AgentClosed { assignment }`. That event, or `AgentIdled` for the
same id, calls `assignment.turnEnded`, which ends the Assignment and frees the seat. `ticket.stop`, a retire and `reap` all
use this one path. A pending Assignment was never seated or told, so `cancelled` ends it directly. A kill of the runner is not an interruption: the
turn resumes from its last committed step (brief :452), and the seat stays held.

### 2. Who is waiting, and in what order

```ts
// plugins/tickets/src/modules/slots/types.ts: pure, so a journey can prove every cell
export const RESERVE = 255n;
export type Why = "launch" | "person" | "input";
export interface Waiting { readonly assignment: string; readonly why: Why }   // given oldest first

export interface Slots {
  /** The next in line: every person's message, then every other, each oldest first. */
  readonly line: (waiting: ReadonlyArray<Waiting>) => ReadonlyArray<Waiting>;
  /** A seat for this one, or none. `held` is the seats of the running and closing Assignments. */
  readonly seatFor: (size: bigint, held: ReadonlySet<bigint>, why: Why) => bigint | undefined;
}

// service.ts, the whole rule
export const slots: Slots = {
  line: (waiting) => [...waiting.filter((w) => w.why === "person"), ...waiting.filter((w) => w.why !== "person")],
  seatFor: (size, held, why) => {
    for (let seat = 1n; seat <= size; seat++) if (!held.has(seat)) return seat;       // the pool first, lowest free
    return why === "person" && !held.has(RESERVE) ? RESERVE : undefined;              // the reserve is a person's alone
  },
};
```

- **The order is the order the rows were made in**, read with `order: "oldest"` (`operations/types.ts:96`: "the order
  rows were made in, never a clock"). No timestamp is read, so a restart, a pause and a replay all keep it.
- **A person goes before a launch or a CI result**; within each group, first come first served. This is the
  prototype's "takes the next free slot before a new launch".
- **The reserve is used last, and only by a person.** A person's message takes a pool seat when one is free. The
  reserve stays free until the pool is full, so a full pool answers one person at once. A second person's message
  while the reserve is held waits at the head of the line for the next seat of either kind to free.
- **No one gets stuck behind the head.** If the head of the line is a person with no seat, the pool is full (a free
  pool seat would have been taken), so nobody behind could start either. The loop that fills seats stops at the first
  no.

### 3. Taking a seat, and giving it back

```ts
// plugins/tickets/blueprint/things/assignment/verbs/start.ts: the move that takes a seat
export default Blueprint.operation(Assignment, {
  description: "Give a waiting Assignment a seat, if one is free for it.",
  move: machine.moves.started,
  payload: { id: Assignment.fields.id },
  answer: { seat: Assignment.fields.seat },
  errors: [NoSeat],                  // a refusal the caller reads as "still waiting"; never a defect
  allowed: [Blueprint.system],
});
// the handler reads the running rows' seats, calls slots.seatFor, writes the seat with the move, and commits
```

- **Taking is one commit.** The seat, the state `running`, the journal entry and the outbox entry for
  `AssignmentStarted` commit together or not at all (K3-stores-and-sources.md:29; `records/types.ts:33-41`). A crash
  leaves a seat and its start, or neither. There is no state where a seat is held and nothing was told to start.
- **A lost race runs again.** Two fills can pick the same seat. The index refuses the second commit; the host reads
  that as `conflict`, and the call runs again (`host-cloudflare/src/modules/store/internal/commit.ts:39`,
  `unique.ts:11-21`), so the loser re-reads, finds the seat held and takes the next, or answers `NoSeat`.
- **Starting twice is refused by the machine.** `started` is only `from: ["pending"]`; the second call gets the
  machine's own refusal, `notFrom` (`machines/types.ts:25-30`).
- **Giving back is leaving `running` and `closing`.** `turnEnded` moves the row to `ended`, which the partial index no
  longer covers, so the seat is free in the same commit. No decrement exists to forget. A stop, a retire or `reap` goes
  through `closing` first, so the seat is freed only once the Agent has acknowledged the id. A handoff to a person
  (`ticket.report` with `ready`, a question, `blocked` or `failed`) is the executor's own call, so the Agent has
  already opened that Assignment, and `turnEnded` ends it in the report's commit, as the prototype frees the slot at once
  (`003-execution.md:37`).
- **Background work keeps the seat.** The executor's `background: { after: "5 seconds", keep: "30 minutes" }` (brief
  :394) is the Agent's own, and the Agent is `working` while it runs. The seat goes when the Agent goes `idle`.
- **A restart neither leaks nor double-counts.** Nothing is in memory: the seats are rows. The one way to leak is a
  row left `running` while its executor is idle, because a crash cut between the Agent going idle and `turnEnded`.
  Two things close it:
  1. `AgentIdled`, from the Agent's `working → idle` move, is delivered through the outbox, at least once and keyed
     by its event id, to `assignment.turnEnded`, which takes the Assignment id **from the event** (`AgentIdled.assignment`) and
     matches its `id`. It never asks for "the executor's live Assignment": a late idle for A1 (delayed by backoff, a
     lease overlap or a manual redeliver) must not end A2. A second delivery or a stale one meets `notFrom` and does nothing. It is **unheld** (GOAL17-pause): a turn that ends during a pause
     gives its seat back, and `fill` stays held.
  2. `superagent.reap` (system, in the same sweep as below, unheld) lists `running` rows and asks each executor's Agent for its
     state (`host-cloudflare/src/modules/actors/types.ts:27-29`, `find`). An idle one's Assignment is **not** ended by `reap`.
     An idle Agent may have finished a turn, or may not have received its opening tell yet (`start` committed, the tell hop
     still on its way), and the two look the same from outside. So `reap` moves it to `closing` (`interrupted`), and the
     Agent answers `AgentClosed`. If the opening tell was still on its way, the close fences it: the late tell is refused
     (`StaleAssignment`) and its Input requeued, so the freed seat is never used by an executor that then wakes. The Agent
     is the truth about work; the Assignment only records the seat.

### 4. What happens when a slot frees

`fill` is declared by the **app**, not by `tickets`: it reads the Superagent's `slots` and state, and `tickets` imports
nothing of `superagent` (GOAL17-pause). `tickets` offers the pure `slots` module and `assignment.start` and
`assignment.list` through its feature's exports (Superseded by GOAL17-names, 23 November 2026: `assignment.started` and `assignment.waiting`). The app's file joins them. `slots` is a value to `tickets`, never an
import: it reaches the pure rule as the `size` argument.

```ts
// examples/superagent/blueprint/features/seats.ts: the app owns the joint, as it owns pause's list
export const fill = Blueprint.operation(Superagent, {
  description: "Start waiting Assignments, in line, while seats are free. Does nothing while paused.",
  payload: { id: Superagent.fields.id },
  answer: { started: Blueprint.uint(8) },
  allowed: [Blueprint.system],
  on: [
    Blueprint.on(tickets.events.AssignmentQueued, (e) => ({ id: e.superagent })),   // held while paused (GOAL17-pause)
    Blueprint.on(tickets.events.AssignmentEnded,  (e) => ({ id: e.superagent })),   // a slot freed; held while paused
    Blueprint.on(SuperagentResumed,               (e) => ({ id: e.superagent })),   // the event that ends the hold; unheld
  ],
});

// the handler, as Effect (a sketch; one commit)
const fillSeats = (id: SuperagentId) => Effect.gen(function* () {
  const sa = yield* Records.find(Superagent, id);
  if (sa === undefined || sa.state === "paused" || sa.state === "retired") return 0n;   // the sweep is not a hop, so it checks too
  const running = yield* list(Assignment, { superagent: id, state: "running", order: "oldest", limit: 255 });
  const closing = yield* list(Assignment, { superagent: id, state: "closing", order: "oldest", limit: 255 });   // still hold their seats
  const waiting = yield* list(Assignment, { superagent: id, state: "pending", order: "oldest", limit: 255 });
  const held = new Set([...running.items, ...closing.items].map((a) => a.seat));
  let started = 0n;
  for (const w of slots.line(waiting.items.map((a) => ({ assignment: a.id, why: a.why })))) {
    const seat = slots.seatFor(sa.slots, held, w.why);
    if (seat === undefined) break;                                   // the head cannot start, so nothing behind it can
    yield* start({ id: w.assignment, seat }); held.add(seat); started += 1n;
  }
  return started;
});
```

- **The seat comes first.** A route's accept queues an Assignment (`AssignmentQueued`) and nothing else about the
  launch. `fill` takes a seat, moves the Assignment to `running` and emits `AssignmentStarted`. The outbox hop on
  `AssignmentStarted` calls `agent.tell` with the Assignment's own `input`. So a launch is: queued, seat, told.
  There is no launch step between the seat and the tell, and none before the queue.
- **Pause holds both ends.** `fill`'s hops and the tell hops are in pause's `held` list. A held launch is an
  Assignment that stays `pending`: **it takes no seat**. `fill` also reads the state on its first line, because the sweep
  below is a `Timers` chain and not a hop.
- **A stop's seat is refilled when the close is acknowledged.** `AssignmentInterrupted` has one delivery, `agent.close`,
  unheld (a person's stop must work in a pause). The seat is held, in `closing`, until `AgentClosed` ends the Assignment;
  that `AssignmentEnded` then calls `fill` like any freed seat.
- **The trigger is an event through the outbox**, so a freed seat is acted on after a restart: `AssignmentEnded` is
  committed with the move that ended the turn, and delivered at least once. `fill` is safe to run twice, because a
  second run finds nothing waiting that can start.
- **A sweep backs it up** every 30 seconds through `Timers.at` (`language-effect/src/modules/timers/types.ts:15-16`),
  as counted work (`work/types.ts:5-6`), the same kind as `evals.due`'s (Superseded by GOAL17-names, 23 November 2026: `eval.due`'s) 2-second pass (brief :324). It runs `superagent.reap`,
  then `superagent.fill`, for each live superagent. A lost event costs at most 30 seconds, never a stuck queue. No handler
  sleeps, reads a clock or awaits: every wait is a timer.
- **Whether one call may start several Assignments is open** (see risks). If a call moves one instance, `fill` calls
  `start` once per Assignment. The rows, the order and the index are the same either way.

### 5. How an executor's input reaches the pool

An executor hears an Input only through `agent.tell`, and `agent.tell` runs only as the `to` of an outbox hop that
pause holds (GOAL17-pause). It never runs inline in a handler. K40 fix 3 feeds an agent that way
(`K40-superagent-gaps.md:117-178`); for an executor the Input thing sits between (spec row, brief :331), and this is
where the seat is checked. Three hops decide what is told, and when:

| Event | Calls | Held? | What it does |
|---|---|---|---|
| `InputStored` | `input.route` | no: rows only | by the ticket's live Assignment: **running**, the Input moves to `routed` and `InputRouted` is emitted; **pending**, it waits for the seat, and a **person's** Input first promotes the Assignment (below); **closing**, it waits (a new Assignment is queued when this one ends); **none**, an Assignment is queued (`why` from the Input, `input` = this Input) and the Input waits |
| `InputRouted` | `agent.tell` (a steer) | yes | `requestId` = the Input's id; refused by the Agent if its Assignment is not the current one |
| `AssignmentStarted` | `agent.tell` (opens the Assignment), and `input.route` | yes, both | the first tells the Assignment's own `input`; the second routes every other Input that waited for the seat, oldest first |
| `AssignmentEnded` | `input.route` (and `fill`) | yes | an Input that waited behind a `closing` or a handed-off Assignment now queues a new one |

```ts
// plugins/tickets/blueprint/things/input/verbs/route.ts
export default Blueprint.operation(Input, {
  description: "Send a waiting Input to its running executor, or queue the Assignment that will start one.",
  allowed: [Blueprint.system],
  on: [
    Blueprint.on(InputStored,       (e) => ({ ticket: e.ticket })),
    Blueprint.on(AssignmentStarted, (e) => ({ ticket: e.ticket })),   // the seat came: route what waited, oldest first
  ],
});
// the hops that tell, in the app's wiring (examples/superagent/blueprint/features/agents.ts). The event carries the text, because the
// hop reads no row: `Blueprint.text({ max: 65536 })` (the default max is 200, values/types.ts:39), and `trigger.receive` clips a
// trigger's text to that. Every tell names its Assignment.
Blueprint.on(InputRouted, (e) => ({ agent: e.agent, requestId: e.input, input: e.text, assignment: e.assignment, opens: false }),
  { onRefused: { error: StaleAssignment, then: input.operations.requeue } });
Blueprint.on(AssignmentStarted, (e) => ({ agent: e.agent, requestId: e.input, input: e.text, assignment: e.assignment, opens: true }),
  { onRefused: { error: StaleAssignment, then: input.operations.requeue } });   // the Assignment was closed before the tell
// a stop or a retire reaches the Agent as its own hop, unheld (a person's stop works in a pause)
Blueprint.on(AssignmentInterrupted, (e) => ({ agent: e.agent, assignment: e.assignment }));   // to: agent.operations.close
```

**A person's Input on a pending Assignment promotes it.** A CI result queues an Assignment (`why: "input"`) while the pool is
full. A person then writes to the same executor. `oneLivePerExecutor` means no second Assignment, so `input.route` runs
`assignment.promote` (Superseded by GOAL17-names, 23 November 2026: `assignment.promoted`) in the same commit as it leaves the Input waiting: the move `promoted` (`pending → pending`) sets `why` to
`person`, and the Assignment row's version guards it against `start`. If `start` won, `route` runs again and finds
`running`, so it routes the Input directly. If `promote` won, `fill`'s `start` of that Assignment conflicts on the row and
runs again, reads `person`, and `seatFor` may now give it the reserve seat, with the person's place in the line. `AssignmentPromoted` is
delivered to `fill` (held), so the promotion is acted on at once. Which Inputs the opening tell carries: the
Assignment's own `input` (the CI result that queued it), and the person's Input, and any other that waited, are
routed by `AssignmentStarted` to `input.route`, which emits `InputRouted` for each in Input order. An Input that arrives
before the start commits joins them that way. One that arrives after routes against `running` and is told directly. No Input is lost, and no
one waits for a seat twice.

**A tell never wakes an executor without a seat, and the Agent is what says so.** `AgentIdled` to `turnEnded` is unheld,
so a turn can end, and its seat free, between `input.route` (which saw a running Assignment) and the tell. Two commits
on two rows cannot be made atomic by a check in the hop, so the check is made where the state lives, inside the
Agent actor's own commit:

```ts
// @orthograph/agents: the Agent keeps the Assignment it is working for. `agent.tell` takes an optional `assignment` and `opens`
// accept:   no assignment (the main agent) · opens: true and the id is not closed (sets `current`) · opens: false and assignment === current
// refuse:   opens: true and the id is closed · opens: false and assignment !== current  →  StaleAssignment (declared), nothing submitted to Pi
// agent.close({ assignment }): records the id as closed (the Agent keeps its last few hundred; Assignment ids never repeat),
//   clears `current` if it matches, stops its turn as `ticket.stop` does, and emits AgentClosed { agent, assignment } in that commit
//   (every close is acknowledged, whether the Agent was working, idle or had never been told)
// AgentIdled (the same commit as working → idle) clears `current` and names the Assignment it was for
export class StaleAssignment extends Blueprint.error("StaleAssignment", { assignment: Blueprint.text() }) {}
```

A steer for an Assignment that is no longer the Agent's is refused in that commit, so nothing is told. So is an
**opening** tell for an Assignment that was closed before it was told: `ticket.stop` or a retire interrupts the Assignment
after `fill` started it but before the tell hop ran, `AssignmentInterrupted` is delivered as `agent.close`, and whichever of
the close and the open reaches the Agent first decides. Close first: the open is refused and its Input requeued (and `route`
queues nothing for a ticket that is not open). Open first: the close stops the turn it began, which holds no seat for any
longer than the hop's latency. The outbox gets one small seam, asked of Goal 11: a hop may name
`onRefused: { error, then: <operation> }`. When the hop fails with that declared error the row is done, `attempts` does not
grow, and the outbox calls the operation, with the event's fields, in place of a retry or a refusal. A held row is never
claimed, so it is never refused. Here the operation is `input.requeue`, the declared move `routed → waiting` (below), which emits
`InputStored`; `input.route` then runs again. If the Assignment has not yet been ended by `turnEnded`, `route` sees it
`running` and tells again, and the Agent refuses again: the cycle repeats once per outbox pass until `AgentIdled`'s own
delivery commits `turnEnded`, which is unheld and so ends it. Then `route` finds no live Assignment and queues a
new one, `fill` seats it, and the Input is told on its `AssignmentStarted` (`opens: true`). So an executor is never woken
by a steer without a seat; the only wake with no earlier seat is the opening tell, which is sent only by `fill`'s commit.
A handoff ends the Assignment (`turnEnded`) while the Agent finishes its turn: steers to that Assignment are still
accepted, because the Agent still holds it as `current`, and no seat is queued for it. A stop does not: it closes it. That is the prototype's "a handoff frees the slot" with
the turn finishing.

**The refusal cycle backs off.** `requeue` does not emit `InputStored` at once. It records `retryAt` on the Input (1 s,
doubling to 30 s, from a per-Input `refusals` count) and arms a `Timers` wait that emits it; the 30 s seat sweep emits it for
any waiting Input whose `retryAt` has passed, so a lost timer is repaired. A person's retry of a `failed` Input has no delay.
Slice 8 checks that a refusal cycle writes at most six rows in 30 seconds before `turnEnded` ends it.

**Who calls `requeue`.** Two callers, one move. The refusal above (`onRefused`) for a routed Input, and, for a
`failed` Input, the retry: `ticket.retry` and a person's "send again" call `input.requeue` on it
(`from: ["routed", "failed"]`). `deliveryFailed` is what puts an Input in `failed` after the outbox gives up on the tell.

```ts
// plugins/tickets/blueprint/things/input/machine.ts: the moves of the Input
routed:    { from: ["waiting"],           to: "routed",    emits: InputRouted },
requeued:  { from: ["routed", "failed"],  to: "waiting",   emits: InputStored },   // a refused tell; a failed Input's retry
delivered: { from: ["routed"],            to: "delivered", emits: InputDelivered },
failed:    { from: ["routed"],            to: "failed",    emits: InputFailed },
```

**A second tell of one Input** (a hop's lease that overlaps a tell that did finish, then `requeue` and a second route) rests on
Pi's `requestId`: the same Input id is dropped by Pi. That is K40's open risk ("`agent.tell` must submit inside Pi's own
commit and mark the request key there"), and this design adds no second guard for it.

**64 KiB of text in an event.** `InputRouted` and `AssignmentStarted` carry up to 65536 characters of untrusted text, and
so does an outbox row. SQLite holds that. `trigger.receive` clips a longer text to it, and the clip is a documented loss: the
Input row keeps the same clipped text, so the executor and the portal read one thing.

**Order.** The outbox orders per `(to, subject)`, and a tell's subject is the Input (`InputRouted`) or the Assignment
(`AssignmentStarted`), not the executor. That is enough: an Assignment's own `input` is the one waiting when it starts,
and `input.route` runs after the start, so the others follow it. Between different Inputs the agent sees them in
arrival order or steers them as they come, each with its own `requestId`, and nothing in a ticket depends on which of
two Inputs the agent reads first. One running Assignment per executor (`oneLivePerExecutor`) means no two
turns compete for one agent's seat.

An Input to a running executor steers it with no new Assignment and no seat, which is slice 8's "a message while it
works steers it". An Input to an idle executor makes a pending Assignment, and the executor hears nothing until the
seat commits. `oneLivePerExecutor` makes two Inputs arriving at once share one Assignment: the second `queued`
commit loses the index and runs again, then finds the first. `ticket.accept` queues the first Assignment with
`why: "launch"` and its first `input` in its one commit (brief :361); a resume queues one the same way.
`assignment.start` (Superseded by GOAL17-names, 23 November 2026: `assignment.started`) also moves the Assignment's own `input` to `routed` in the commit that takes the seat.

### 6. What "a person's message" means here

An Input is `why: "person"` when the thing behind it is a person, and in no other case:

```ts
// plugins/tickets/src/modules/slots/internal/why.ts: pure
export const whyOf = (origin: InputOrigin): Why =>
  origin.kind === "trigger" && origin.account.bot === false && origin.basis !== "bot" ? "person"   // an Account, K40 fix 1
  : origin.kind === "portal" && origin.principal.kind === "person"                    ? "person"   // a signed-in person's chat
  : origin.kind === "status" && origin.principal.kind === "person"                    ? "person"   // a person's `ticket.requestStatus`: it may use the reserve
  : origin.kind === "launch" || origin.kind === "resume"                              ? "launch"
  : "input";                                                                                      // CI, a bot, a timer, the system, another agent
```

- A trigger is a person's when it came from an `Account` (K40 fix 1) whose `bot` is `false`, and the gate let it
  through on a thread the ticket follows (the gate's `basis`, brief :353). The gate already stops a stranger
  (`strength: "none"`), so a person's message here is always from a listed account or an addressed one the policy
  admits. The account is never linked to a portal person (K40 fix 1).
- A portal message is a person's when its caller is a `person` principal (`orthograph/src/modules/roles/types.ts:16`).
  An agent acting for a person is not: it is `input`, so an agent cannot spend the reserve.
- It is recorded on the Assignment's `why`, once, when queued. Pause or a restart cannot change it.
- A status request is a person's when a person asks (`ticket.requestStatus` is allowed to a signed-in person and to
  the main agent). The main agent's own request is `input`, so an agent cannot spend the reserve.
- A bot comment, a CI result, a timer and another ticket's agent are `input` and wait for a pool seat.

### 7. How pause holds launches without losing the queue

The pause itself is GOAL17-pause's, and its two lists name the same events and operations as this record. This record
needs five things from it:

- **Nothing in the line is touched.** Pause never moves, deletes or reorders a pending Assignment. They are rows in
  creation order; `queued` keeps being committed while paused, because sources keep recording triggers and
  `InputStored` to `input.route` is unheld (rows only).
- **A held launch takes no seat.** `AssignmentQueued` to `fill` and `AssignmentEnded` to `fill` are held, and so is the
  tell on `AssignmentStarted`. So no Assignment starts, and nothing is told, during a pause. `fill` also reads the
  Superagent's state on its first line, for the sweep.
- **A person's message does not skip a pause.** Prototype: pause stops Input delivery (`003-execution.md:192-199`).
  The Input is stored, routed or queued as rows, and its `agent.tell` is a held hop, so a message to a **running**
  executor waits too. The reserve is not a way round the switch.
- **Seats already held stay held.** A running turn is not interrupted, and a pause frees no seat. A turn that ends
  during a pause frees its own (`AgentIdled` to `turnEnded` is unheld), and `superagent.reap` is unheld too. Neither
  starts anything.
- **On resume** `SuperagentResumed` calls `fill` (unheld), and the held rows are released in their order. Then the line
  starts in its own order: every person's message that arrived during the pause, then the rest, each oldest first.
  A person's message that arrived during the pause therefore goes ahead of an older CI result, by design.

### 8. The events recorded

```ts
export const InputStored       = Blueprint.event({ superagent, input, ticket });
export const InputRouted       = Blueprint.event({ superagent, input, ticket, agent, assignment, text: Blueprint.text({ max: 65536 }) });
export const AssignmentQueued  = Blueprint.event({ superagent, assignment, ticket, input, why: Why });
export const AssignmentStarted = Blueprint.event({ superagent, assignment, ticket, agent, input, text: Blueprint.text({ max: 65536 }), seat, why: Why });
export const AssignmentEnded   = Blueprint.event({ superagent, assignment, ticket, seat });                          // a turn ended or a handoff
export const AssignmentInterrupted = Blueprint.event({ superagent, assignment, ticket, agent, seat });                 // a stop, a retire, reap: closes the Agent's side
export const AssignmentPromoted    = Blueprint.event({ superagent, assignment, ticket });                              // a person's Input made a pending one `person`
// @orthograph/agents: agent.close's own commit; the acknowledgement that frees a closing seat
export const AgentClosed           = Blueprint.event({ agent: Agent.fields.id, assignment: Blueprint.text() });
// @orthograph/agents: the Agent's `working → idle` move. It names no superagent, which an agents package knows nothing of
export const AgentIdled        = Blueprint.event({ agent: Agent.fields.id, about: Blueprint.text(), assignment: Blueprint.text() });   // the Assignment the Agent was working for
```

All of them are written to the journal with their move (`language-effect/src/modules/journal/types.ts:4-13`), so
`prove` finds them by trace. `AssignmentStarted` and `AssignmentEnded` are the brief's own names (:342);
`InputStored`, `InputRouted`, `AssignmentQueued`, `AssignmentInterrupted`, `AssignmentPromoted`, `AgentIdled` and `AgentClosed` are new, and join the brief's list with `ReplyQueued`
and `EvalDelivered` from GOAL17-pause. Every one that crosses the outbox is in exactly one of pause's two lists.
`AgentIdled` is listed unheld although it carries no `superagent`: the compiler accepts a listed event without the
field, with a NULL `hold`. `InputDelivered` and `InputFailed` are the Input moves' own events and carry no delivery. `seat` is on `AssignmentStarted` and `AssignmentEnded`, so the portal's executor load
(brief :418) reads "5 of 8 in use, reserve free, 2 waiting" from the rows and a person can see which seat a ticket holds.

### 9. How slice 8's check "a full pool keeps its slot for a person" is observed

The journey runs on the stand-in model, and the stand-in holds each executor's turn open until the script lets it go,
so a full pool stays full as long as the script wants. No wall clock is involved.

```ts
// e2e/superagent/journeys/slots.ts
const s = Blueprint.journey("a full pool keeps its slot for a person", { world: threeTicketsAndOneIdle, size: 2 })
  .step("two tickets take the whole pool", call(ticket.accept, { …1 }), call(ticket.accept, { …2 }),
    expect((a) => seatsOf(a.running), [1n, 2n]))
  .step("a third waits in line", call(ticket.accept, { …3 }),
    machine.isIn(s.last.assignment, "pending"),
    emits(AssignmentQueued, { why: "launch" }), noEvents(AssignmentStarted))
  .step("a CI result for an idle fourth also waits", call(input.store, { ticket: 4, from: ci }),
    machine.isIn(s.last.assignment, "pending"))
  .step("a person writes to the idle fourth: its pending Assignment is promoted and the reserve is used", call(input.store, { ticket: 4, from: octocat }),
    emits(AssignmentPromoted), emits(AssignmentStarted, { seat: 255n, why: "person" }))
  .step("a person's status request may use the reserve too", call(ticket.requestStatus, { ticket: 6, as: ann }),
    emits(AssignmentQueued, { why: "person" }))
  .step("a second person's message waits, ahead of the launch", call(input.store, { ticket: 5, from: octocat }),
    expect(order(s.read(assignment.waiting)), ["person", "launch", "input"]))
  .step("a seat frees: the second person starts, not the launch", call(stand.finishTurn, { ticket: 1 }),
    emits(AssignmentEnded, { seat: 1n }), emits(AssignmentStarted, { seat: 1n, why: "person" }))
  .step("a restart changes none of it", call(world.restart),
    expect((a) => seatsOf(a.running), [1n, 2n, 255n]))
  .step("a duplicate start is refused", call(assignment.start, { id: s.world.first }), refuses(machine.notFrom));   // Superseded by GOAL17-names, 23 November 2026: `assignment.started`
```

What proves it, each from a place a journey already reads (`journeys/types.ts:57-66`): the machine's state
(`machine.isIn`, `machines/types.ts:53`), the events with their fields (`emits`), and the unique rule's refusal
(`refuses`). Two further checks are for the builder's own test, because they need a race: two `fill`s at once leave
one holder per seat (`oneHolderPerSeat`), and a runner killed between the Agent going idle and `turnEnded` has its
seat reaped by the next sweep. Pause's own journey (GOAL17-pause) adds: with the superagent paused, a person's message
to a running executor and to an idle one both wait, a queued Assignment takes no seat, and on resume the person's starts first.

## Two writers, one guard

The bugs this design kept finding had one shape: two operations read one row's state and write **different** rows, so
neither commit conflicts with the other and each decides on a state the other just changed. A single writer is safe by
the store's version guard. Two writers need a row they both write, a unique rule, or a refusal made where the state
lives. This is every such pair across the four records, with its guard. Rows marked **fixed** were found by this sweep.

| Pair | What each reads, and writes | The one guard |
|---|---|---|
| `fill` and `fill`; `start` and `start` (seats) | both read the running seats; both write an Assignment | `oneHolderPerSeat`, a unique index: the loser conflicts and runs again |
| `route` and `route`; `route` queuing an Assignment | both read "no live Assignment" and queue one | `oneLivePerExecutor`, a unique index |
| `route` and `turnEnded` (an Input and a turn that ends) | `route` reads a running Assignment and writes an Input; `turnEnded` writes the Assignment | **the Agent actor's own commit**: a steer for an Assignment that is not its `current` is refused (`StaleAssignment`), and the Input is requeued. The seat state is never trusted across two commits |
| `route` for a pending Assignment and `start` | `route` reads `pending` and leaves the Input waiting; `start` writes the Assignment | state only moves forward: `start`'s own `input.route` lists the waiting Inputs after the commit, and an Input stored later routes against `running`. Neither can miss the other |
| `route`, `requeue` and `delivered` on one Input | each moves the Input | the Input's machine (`from` states) and the row's version |
| `stop` or a handoff and `start` / `fill` | `stop` reads a pending Assignment; `fill` starts it | both write the Assignment row; `started` is `from: ["pending"]` and `interrupted` from `pending` or `running` (Superseded by GOAL17-names, 23 November 2026: `interrupted` is from `running` only, as the machine says; a pending one is `cancelled`), so one refuses |
| `turnEnded`, `reap` and a late `AgentIdled` (**fixed**) | each can end an Assignment, and a delayed idle for A1 could arrive after A2 started | `turnEnded` takes the Assignment id from the event (`AgentIdled.assignment` or `AgentClosed.assignment`) and matches that `id`, never "the executor's live one". A stale one for A1 meets `notFrom` on A1 and cannot end A2. `reap` ends nothing: it only moves to `closing` |
| `reap` and the opening tell (**fixed**) | `reap` reads an idle Agent and frees a seat; the tell is still on its way | the Agent's own commit: `reap` moves to `closing` (the seat is still held), `agent.close` records the id as closed, and only `AgentClosed` ends the Assignment. A late open is refused. A seat is never freed before the Agent has acknowledged the id |
| `promote` and `start` (**fixed**) | `route` reads a pending Assignment and writes `why`; `fill` reads `why` and starts it | the Assignment row's version: both write the Assignment, the loser re-reads (`fill` then sees `person`, or `route` then sees `running`) |
| `stop` and the opening tell (**fixed**) | the opening tell is sent after `start`'s commit; `stop` writes the Assignment | the **Agent actor**: `AssignmentInterrupted` (running to `closing`) is delivered as `agent.close`, which records the id as closed in the Agent's own commit. An open for a closed id is refused (`StaleAssignment`), and `onRefused` requeues the Input; a close after an open ends the turn it started |
| `withdraw` of a head and `reply` (**fixed**) | `withdraw` drops a head; `reply` reads whether a head exists | `withdraw` bumps `Ticket.seq` too, so the two conflict and the loser re-reads |
| a refusal cycle and `turnEnded` | the cycle requeues and routes; `turnEnded` ends the Assignment | the Agent's refusal, with `requeue` backing off through `Timers` (section 5) |
| `reply` and the head's `send` (**fixed**) | `reply` reads "a head exists", `send` reads "a later message exists"; they write different messages | both bump `Ticket.seq`, so any two conflict and the loser re-reads |
| `retry`, the retry timer and the sweep (**fixed**) | each reads `notBefore` and writes the same message's outbox row | the message row: `notBefore` is cleared in the commit that emits, so the second does nothing |
| `batch` and `batch`, the eval pass | two passes read the same waiting triggers | the Thread's machine (`idle → queued`), one write on one row |
| `expire` and `decide` on one Eval | both move the Eval | the Eval's machine |
| two chains of the eval pass (**fixed**) | `arm` checks that no chain exists, then starts one; two arms or an arm racing the last timer make two | `Superagent.passGen`: `arm` bumps it, and a pass of an older generation ends at its next run (GOAL17-pause) |
| `proposal.approve` and `proposal.reject` | both move the Proposal | the Proposal's machine |
| `approve` and any other save of what it changes | it reads a base version and writes the Policy, Prompts or Superagent | `versions:` (K40 fix 2): a stale base is refused and the Proposal keeps its draft |
| two `thread.follow` of one thread by one ticket (**fixed**) | both read "not subscribed" and create a Subscription | a unique rule on `(ticket, thread)` while live: the second `follow` refuses and runs again |
| `thread.unrelated` and `ticket.end` | both move the Subscription | the Subscription's machine |
| two `account.seen` for one sender (**fixed**) | both read "no Account" and create one | a unique rule on `(superagent, source, id)` (the Account's key, GOAL17-source-from; Superseded by GOAL17-account-key, 23 November 2026: `external`) |
| `account.list` and `account.seen` | both move the Account | the Account's machine |
| a pause and a claim | the claim reads the Superagent's state and writes the outbox row | one SQL statement: the claim's `NOT EXISTS` over the hold view (GOAL17-pause) |
| a poll's failure count and `disable` | both write the Source | the Source row's version |

## What it touches

| Dependent | Why it cares |
|---|---|
| `design/goals/17-superagent.md` :330, :342, :388 | Assignment's row, the events list and the executor's `slots:` take this record's shape (edits below) |
| GOAL17-pause | its two lists name this record's events and operations: `fill` and every tell hop held, bookkeeping unheld; held seats stay held |
| `examples/superagent` | owns `fill`, `reap` and the sweep (`features/seats.ts`), so `tickets` and `superagent` stay independent |
| K40 fix 3, `@orthograph/agents` (Goal 10) | The executor's `agent.tell` runs only from a held hop (`InputRouted`, `AssignmentStarted`); `AgentIdled` names no superagent; `slots:` is a declaration the agent kind carries, nothing the agents package counts |
| `@orthograph/tickets` | `input.route`, `assignment.*`, `ticket.report` and `ticket.accept` write Assignments; one new module `slots`, a pure value in, no import of superagent |
| Overview page (brief :418) | "executor load" reads running and closing seats, waiting count and whether the reserve is held |
| Slice 8 and 9 | the check above; the builder writes the handlers to it |
| Goal 11 (the outbox, M5.03) | an Ask: a hop may name `onRefused: { error, then: <operation> }`. When the hop fails with that declared error the row is done, `attempts` does not grow, and the operation is called with the event's fields in its place. A held row is never claimed, so it is never refused: the seam composes with `hold` |
| `@orthograph/agents` (Goal 10) | the Agent keeps its `current` Assignment, refuses a stale steer with `StaleAssignment` inside its own commit, and `AgentIdled` names the Assignment |
| `packages/orthograph`, `compiler` | nothing new: `unique ... while`, machines and events are in the framework; `oneOf` and `Blueprint.agent` are the brief's slice 5 |

## Evidence

- Brief: `design/goals/17-superagent.md:199, :324, :330, :342, :361, :388, :394, :418, :452, :496-497, :554`.
- K39, `K39-superagent.md:126-130` (stored work through the outbox); K40 fix 3, `K40-superagent-gaps.md:117-178`
  (an agent is its own thing, fed by `agent.tell`, event id as `requestId`).
- The store's commit: `K3-stores-and-sources.md:29`, `K5-the-whole-shape.md:505`,
  `packages/language-effect/src/modules/records/types.ts:33-41, :75`.
- The unique rule: `packages/orthograph/src/modules/invariants/types.ts:26-30, :51-55`;
  `packages/projections/src/modules/server/internal/worker-config.ts:60, :66-68`;
  `packages/host-cloudflare/src/modules/store/internal/commit.ts:39`, `unique.ts:11-21`.
- The machine's refusal: `packages/orthograph/src/modules/machines/types.ts:25-30, :53`.
- Order by creation, not a clock: `packages/orthograph/src/modules/operations/types.ts:96`.
- The actor answers its own state: `packages/host-cloudflare/src/modules/actors/types.ts:27-29`, `README.md`.
- Waits and counted work: `packages/language-effect/src/modules/timers/types.ts:15-17`, `work/types.ts:5-6`.
- Callers: `packages/orthograph/src/modules/roles/types.ts:14-19` (a `person` is the only one a `why: "person"` can be).
- The prototype, as data: `003-execution.md:31-39` (background work and slots), `:55-61` (concurrency),
  `:192-199` (pause processing).

## Open risks

- **One call, many Assignments.** Whether a handler may move several instances of one thing in a call is not shown in
  the framework (the brief's `accept` writes six records of different things). If not, `fill` calls `start` once per
  Assignment, and each start is still guarded by the index. A short spike in slice 9 settles it.
- **A partial index and a composite key on the actor-free store.** `Assignment` lives in the default database, where
  the rule is enforced (`worker-config.ts:66-68`). It must not move to `lives: "actor"`: a thing in an actor can't be
  listed (`K3-stores-and-sources.md:55`), and `fill` lists.
- **Two stores, one truth.** The Agent (an actor) and its Assignment (a database row) are two stores, so the seat
  can briefly say `running` while the Agent is idle. `AgentIdled` and the sweep close it; the worst case is 30
  seconds of an unused seat, never a double-held one.
- **Starvation.** Many people writing at once can keep non-person inputs waiting. A person is rate-limited by being a
  person; it is the prototype's rule as well. A later measure is an age bonus, kept in `design/later.md`, not built.
- **A close that never lands.** If `agent.close` fails for good, a seat stays `closing`. `reap` lists `closing` rows
  too and sends `agent.close` again; slice 8 checks it.
- **Reap grace.** `reap` closes an idle `running` Assignment only after it has stayed idle for one whole sweep, so an
  opening tell a few milliseconds away is not churned.
- **Lowering `slots` while seats above the new size are held.** Those seats stay held until their turns end (a turn is
  never interrupted). `seatFor` scans seats 1 to the new size and takes any free one, so a new start can take a low
  seat while a high one is still held: more than `size` can run at once until those turns end, and nothing starts
  above the new size. Raising it lets `fill` start more at the next event or sweep.
- **A pause holds no seat.** A launch that is still `pending` has none, so a long pause cannot leave a person's message
  waiting behind a launch that took a seat and did nothing. Seats held by running turns stay held; the portal shows
  "waiting for a seat" for the rest.
- **A refused steer can cycle** for the few moments between the Agent going idle and `turnEnded` committing; it is bounded by that
  delivery and costs rows, never a wrongly seated turn.
- **An Input is told once per hop, and the hops are disjoint.** The Assignment's own `input` goes by
  `AssignmentStarted`'s tell, every other by `InputRouted`'s (their order is per Input or Assignment: section 5). Pi's `requestId` is the Input's id, so a second tell of one
  Input is dropped by Pi (K40 fix 3), but that depends on the open risk K40 names ("`agent.tell` must submit inside
  Pi's own commit and mark the request key there").

## Supersedes

The lead applied these to the brief with this record.

- `design/goals/17-superagent.md`: "`pending → running → ended` | `started`, `interrupted`, `turnEnded` (system) |" → "`pending → running → closing → ended`; holds a seat while running or closing (GOAL17-executor-slots) | `queued` (system: an accept, an Input or a resume; it names the Input that woke it), `promoted` (system: a person's Input on a pending one), `started` (system, from `fill`: takes the seat), `cancelled` (a pending one), `interrupted` (a stop, a retire or `reap`: closes it, and keeps the seat), `turnEnded` (system, on `AgentIdled` or `AgentClosed`); `superagent.fill` and `superagent.reap` (system; the app declares them, so tickets imports nothing of superagent) |"
- `design/goals/17-superagent.md`: "`ticketCreated`, `ticketResumed`, `ticketEnded`, `assignmentStarted`, `assignmentEnded`, `threadSubscribed`," → "`ticketCreated`, `ticketResumed`, `ticketEnded`, `inputStored`, `inputRouted`, `assignmentQueued`, `assignmentStarted`, `assignmentEnded`, `assignmentInterrupted`, `assignmentPromoted`, `agentIdled`, `agentClosed`, `replyQueued`, `threadSubscribed`,"
- `design/goals/17-superagent.md`: "slots: superagent.slots," → "slots: { size: superagent.slots, reserve: 1, held: Assignment },"
- `design/goals/17-superagent.md`: "a launch is a workflow (prepare the sandbox, open the executor, send its first input); a delivery or relay is" → "a launch is an Assignment: its seat comes first, then `agent.tell` sends its first input, and its sandbox opens on the executor's first tool call (GOAL17-executor-slots); a delivery or relay is"
- `design/goals/17-superagent.md`: "`attach`, `requestStatus`, `note` (main);" → "`attach`, `note` (main); `requestStatus` (main, or a person, whose request may use the reserve seat: GOAL17-executor-slots);"
- `design/goals/17-superagent.md`: "| Input | thing, tickets | `delivered`, `read`, `deliveryFailed` (system) |" → "| Input | thing, tickets; `seq`, the ticket's count when it was made (GOAL17-derived-reads); `waiting ⇄ routed → delivered`, `failed → waiting` | `store` (system, person), `route` (system: to a running executor, or it queues an Assignment), `requeue` (system: a tell that finds no seat, or a retry), `delivered`, `read`, `deliveryFailed` (system) |"
- `design/goals/17-superagent.md`: "| Subscription | thing, tickets; own, attached, context, bound |" → "| Subscription | thing, tickets; own, attached, context, bound; one per ticket and thread (GOAL17-executor-slots) |"
