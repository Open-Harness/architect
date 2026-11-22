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
  fields: { /* … */ slots: Blueprint.uint(8) /* 1 to 254; superagent.update refuses 0 and 255 */ },
});

// plugins/tickets/blueprint/things/assignment/thing.ts
export const Assignment = Blueprint.thing({
  description: "One stretch of a ticket's executor holding a seat: it waits, runs, ends.",
  fields: {
    id: Blueprint.id("asg"),
    superagent: Superagent.fields.id,
    ticket: Ticket.fields.id,
    agent: Agent.fields.id,                       // the ticket's executor (K40 fix 3)
    why: Blueprint.oneOf(["launch", "person", "input"]),   // who is waiting: the order and the reserve read this
    seat: Blueprint.uint(8),                      // 0 until it starts; 1 to 254 the pool; 255 the reserve
  },
});

// .../assignment/machine.ts: the brief's three states and moves, plus the one that makes it
export const machine = Blueprint.machine(Assignment, {
  states: ["pending", "running", "ended"],
  moves: {
    queued:      { from: [],                      to: "pending", emits: AssignmentQueued },
    started:     { from: ["pending"],             to: "running", emits: AssignmentStarted },
    turnEnded:   { from: ["running"],             to: "ended",   emits: AssignmentEnded },   // how: "turnEnded"
    interrupted: { from: ["pending", "running"],  to: "ended",   emits: AssignmentEnded },   // how: "interrupted"
  },
  notFrom: { exit: 2 },
});

// .../assignment/invariants.ts: the two rules that make the count honest
export const oneHolderPerSeat = Blueprint.invariant.unique(
  [Assignment.fields.superagent, Assignment.fields.seat],
  { while: [machine.states.running], refuse: SeatTaken },
);
export const oneLivePerExecutor = Blueprint.invariant.unique(
  Assignment.fields.agent,
  { while: [machine.states.pending, machine.states.running], refuse: ExecutorAlreadyQueued },
);

// the executor's declaration (brief :388) says which thing holds its seats, and where the size is
export default Blueprint.agent({ /* … */ slots: { size: superagent.slots, reserve: 1, held: Assignment } });
```

These forms exist today: a composite `unique` with `while` (`packages/orthograph/src/modules/invariants/types.ts:26-30`,
`:51-55`), compiled to one partial unique index per rule (`packages/projections/src/modules/server/internal/worker-config.ts:66-68`,
"over the rule's key, within its `while` states"). `Blueprint.oneOf`, `Blueprint.agent` and its `slots:` are the
brief's proposals (slice 5). `seat` is `0` and not empty because every field is a `NOT NULL` column
(`worker-config.ts:60`); the index covers only `running` rows, so a `0` is never compared.

The `interrupted` move is the brief's own name. It ends a pending Assignment that never held a seat (`ticket.stop`, a
retired superagent) and a running one whose turn was stopped or failed. A kill of the runner is not an interruption: the
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
  /** A seat for this one, or none. `held` is the seats of the running Assignments. */
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
- **Giving back is leaving `running`.** `turnEnded` and `interrupted` move the row to `ended`, which the partial
  index no longer covers, so the seat is free in the same commit that ended the turn. No decrement exists to forget.
  A handoff to a person does the same: `ticket.report` with `ready`, a question, `blocked` or `failed` ends the
  Assignment in its own commit, as the prototype frees the slot at once (`003-execution.md:37`).
- **Background work keeps the seat.** The executor's `background: { after: "5 seconds", keep: "30 minutes" }` (brief
  :394) is the Agent's own, and the Agent is `working` while it runs. The seat goes when the Agent goes `idle`.
- **A restart neither leaks nor double-counts.** Nothing is in memory: the seats are rows. The one way to leak is a
  row left `running` while its executor is idle, because a crash cut between the Agent going idle and `turnEnded`.
  Two things close it:
  1. `AgentIdled`, from the Agent's `working → idle` move, is delivered through the outbox, at least once and keyed
     by its event id, to `assignment.turnEnded`. A second delivery meets `notFrom` and does nothing.
  2. `assignment.reap` (system, in the same sweep as below) lists `running` rows and asks each executor's Agent for its
     state. The actor answers from its own SQLite (`host-cloudflare/src/modules/actors/types.ts:27-29`, `find`). An
     idle one's Assignment is ended. The Agent is the truth about work; the Assignment only records the seat.

### 4. What happens when a slot frees

```ts
// plugins/tickets/blueprint/things/superagent/verbs/fill.ts
export default Blueprint.operation(Superagent, {
  description: "Start waiting Assignments, in line, while seats are free. Does nothing while paused.",
  payload: { id: Superagent.fields.id },
  answer: { started: Blueprint.uint(8) },
  allowed: [Blueprint.system],
  on: [
    Blueprint.on(AssignmentQueued, (e) => ({ id: e.superagent })),
    Blueprint.on(AssignmentEnded,  (e) => ({ id: e.superagent })),    // a slot freed
    Blueprint.on(SuperagentResumed, (e) => ({ id: e.superagent })),   // GOAL17-pause's event; see Pause
  ],
});

// the handler, as Effect (a sketch; one commit)
const fill = (id: SuperagentId) => Effect.gen(function* () {
  const sa = yield* Records.find(Superagent, id);
  if (sa === undefined || sa.state === "paused" || sa.state === "retired") return 0n;
  const running = yield* list(Assignment, { superagent: id, state: "running", order: "oldest", limit: 255 });
  const waiting = yield* list(Assignment, { superagent: id, state: "pending", order: "oldest", limit: 255 });
  const held = new Set(running.items.map((a) => a.seat));
  let started = 0n;
  for (const w of slots.line(waiting.items.map((a) => ({ assignment: a.id, why: a.why })))) {
    const seat = slots.seatFor(sa.slots, held, w.why);
    if (seat === undefined) break;                                   // the head cannot start, so nothing behind it can
    yield* start({ id: w.assignment, seat }); held.add(seat); started += 1n;
  }
  return started;
});
```

- **The trigger is an event through the outbox**, so a freed seat is acted on after a restart: `AssignmentEnded` is
  committed with the move that ended the turn, and delivered at least once. `fill` is safe to run twice, because a
  second run finds nothing waiting that can start.
- **A sweep backs it up** every 30 seconds through `Timers.at` (`language-effect/src/modules/timers/types.ts:15-16`),
  as counted work (`work/types.ts:5-6`), the same kind as `evals.due`'s 2-second pass (brief :324). It runs `reap`,
  then `fill`, for each live superagent. A lost event costs at most 30 seconds, never a stuck queue. No handler
  sleeps, reads a clock or awaits: every wait is a timer.
- **Whether one call may start several Assignments is open** (see risks). If a call moves one instance, `fill` calls
  `start` once per Assignment. The rows, the order and the index are the same either way.

### 5. How an executor's input reaches the pool

The executor's input is never `agent.tell` straight from the event. K40 fix 3 feeds an agent with `agent.tell` through
the outbox (`K40-superagent-gaps.md:117-178`); for an executor the Input thing sits between them (spec row, brief
:331), and this is where the seat is checked:

```ts
// plugins/tickets/blueprint/things/input/verbs/deliver.ts: the brief's `delivered` (system)
export default Blueprint.operation(Input, {
  allowed: [Blueprint.system],
  on: [
    Blueprint.on(InputStored,       (e) => ({ ticket: e.ticket })),
    Blueprint.on(AssignmentStarted, (e) => ({ ticket: e.ticket })),   // the seat came: deliver what waited, oldest first
  ],
});
// per waiting Input of the ticket, by the ticket's live Assignment:
//   running  → agent.tell(agent, input), requestId = the Input's id; a busy agent is steered
//   pending  → leave it waiting; AssignmentStarted will call this again
//   none     → queue an Assignment (`why` from the Input) and leave it waiting
```

An Input to a running executor steers it with no new Assignment and no seat, which is slice 8's "a message while it
works steers it". An Input to an idle executor makes a pending Assignment, and the executor hears nothing until the
seat commits. `oneLivePerExecutor` makes two Inputs arriving at once share one Assignment: the second `queued`
commit loses the index and runs again, then finds the first. `ticket.accept` queues the first Assignment with
`why: "launch"` in its one commit (brief :361); a resume queues one the same way.

### 6. What "a person's message" means here

An Input is `why: "person"` when the thing behind it is a person, and in no other case:

```ts
// plugins/tickets/src/modules/slots/internal/why.ts: pure
export const whyOf = (origin: InputOrigin): Why =>
  origin.kind === "trigger" && origin.account.bot === false && origin.basis !== "bot" ? "person"   // an Account, K40 fix 1
  : origin.kind === "portal" && origin.principal.kind === "person"                    ? "person"   // a signed-in person's chat
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
- A bot comment, a CI result, a timer and another ticket's agent are `input` and wait for a pool seat.

### 7. How pause holds launches without losing the queue

The pause itself is GOAL17-pause's. This record needs three things from it, and states what it does about each.

- **Nothing in the line is touched.** Pause never moves, deletes or reorders a pending Assignment. They are rows in
  creation order; `queued` keeps being committed while paused, because sources keep recording triggers.
- **`fill` stops at its first line**, reading the Superagent's state (`sa.state === "paused"` above). If GOAL17-pause
  holds processing another way, `fill` asks that one function instead; its place in the code is that first line.
- **A person's message does not skip a pause.** Prototype: pause stops Input delivery (`003-execution.md:192-199`).
  The Input is stored and its Assignment queued; the reserve is not a way round the switch.
- **Seats already held stay held.** A running turn is not interrupted, and a launch already under way keeps its seat
  while it waits. A pause frees no seats; it only stops new ones.
- **On resume** `fill` runs: from the `SuperagentResumed` event, and in any case from the sweep. Then the line starts
  in its own order: every person's message that arrived during the pause, then the rest, each oldest first.
  A person's message that arrived during the pause therefore goes ahead of an older CI result, by design.

### 8. The events recorded

```ts
export const AssignmentQueued  = Blueprint.event({ superagent, assignment, ticket, why: Why });
export const AssignmentStarted = Blueprint.event({ superagent, assignment, ticket, agent, seat, why: Why });
export const AssignmentEnded   = Blueprint.event({ superagent, assignment, ticket, seat, how: Blueprint.oneOf(["turnEnded", "interrupted"]) });
```

All three are written to the journal with their move (`language-effect/src/modules/journal/types.ts:4-13`), so
`prove` finds them by trace. `AssignmentStarted` and `AssignmentEnded` are the brief's own names (:342);
`AssignmentQueued` is new. `seat` is on both, so the portal's executor load (brief :418) reads "5 of 8 in use, reserve
free, 2 waiting" from the rows and a person can see which seat a ticket holds.

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
  .step("a person writes to the idle fourth: the reserve is used", call(input.store, { ticket: 4, from: octocat }),
    emits(AssignmentStarted, { seat: 255n, why: "person" }))
  .step("a second person's message waits, ahead of the launch", call(input.store, { ticket: 5, from: octocat }),
    expect(order(s.read(assignment.waiting)), ["person", "launch", "input"]))
  .step("a seat frees: the second person starts, not the launch", call(stand.finishTurn, { ticket: 1 }),
    emits(AssignmentEnded, { seat: 1n, how: "turnEnded" }), emits(AssignmentStarted, { seat: 1n, why: "person" }))
  .step("a restart changes none of it", call(world.restart),
    expect((a) => seatsOf(a.running), [1n, 2n, 255n]))
  .step("a duplicate start is refused", call(assignment.start, { id: s.world.first }), refuses(machine.notFrom));
```

What proves it, each from a place a journey already reads (`journeys/types.ts:57-66`): the machine's state
(`machine.isIn`, `machines/types.ts:53`), the events with their fields (`emits`), and the unique rule's refusal
(`refuses`). Two further checks are for the builder's own test, because they need a race: two `fill`s at once leave
one holder per seat (`oneHolderPerSeat`), and a runner killed between the Agent going idle and `turnEnded` has its
seat reaped by the next sweep. Pause's own journey (GOAL17-pause) adds: with the superagent paused, a person's message
queues, starts nothing, and starts first on resume.

## What it touches

| Dependent | Why it cares |
|---|---|
| `design/goals/17-superagent.md` :330, :342, :388 | Assignment's row, the events list and the executor's `slots:` take this record's shape (edits below) |
| GOAL17-pause | `fill` reads its switch on one line and listens for a resume event; held seats stay held across it |
| K40 fix 3, `@orthograph/agents` (Goal 10) | The executor's `agent.tell` waits behind `input.deliver`; `slots:` is a declaration the agent kind carries, nothing the agents package counts |
| `@orthograph/tickets` | `input.deliver`, `assignment.*`, `ticket.report` and `ticket.accept` write Assignments; one new module `slots` |
| Overview page (brief :418) | "executor load" reads running seats, waiting count and whether the reserve is held |
| Slice 8 and 9 | the check above; the builder writes the handlers to it |
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
- **Lowering `slots` while seats above it are held.** Those seats stay held until their turns end; nothing new
  starts until fewer than the new size are held. Raising it lets `fill` start more at the next event or sweep.
- **A paused launch keeps its seat**, so a long pause with a full pool can leave a person's message waiting for a
  seat even after resume until a turn ends. This follows the prototype (`:192-199`); the portal shows it as "waiting
  for a seat".
- **`input.deliver` wakes twice** (on `InputStored` and on `AssignmentStarted`). Pi's `requestId` is the Input's id, so
  a second delivery of one Input is dropped by Pi (K40 fix 3), but that depends on the open risk K40 names
  ("`agent.tell` must submit inside Pi's own commit and mark the request key there").

## Supersedes

The lead applied these to the brief with this record.

- `design/goals/17-superagent.md`: "`pending → running → ended` | `started`, `interrupted`, `turnEnded` (system) |" → "`pending → running → ended`; holds a seat while running (GOAL17-executor-slots) |"
- `design/goals/17-superagent.md`: "`ticketEnded`, `assignmentStarted`, `assignmentEnded`," → "`ticketEnded`, `assignmentQueued`, `assignmentStarted`, `assignmentEnded`,"
- `design/goals/17-superagent.md`: "slots: superagent.slots," → "slots: { size: superagent.slots, reserve: 1, held: Assignment },"
