<!-- Generated from the blueprint. Do not edit. -->
# assignment

One stretch of a ticket's executor holding a seat: it waits, runs, ends.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| ticket | ticket.id |
| agent | agent.id |
| input | input.id |
| why | schema |
| seat | uint |

## Machine

States: pending, running, closing, ended. A move from the wrong state is refused AssignmentNotPending (exit 94).

| move | from | to | emits |
|---|---|---|---|
| queued | (creates) | pending | AssignmentQueued |
| promoted | pending | pending | AssignmentPromoted |
| started | pending | running | AssignmentStarted |
| cancelled | pending | ended | AssignmentEnded |
| interrupted | running | closing | AssignmentInterrupted |
| turnEnded | running, closing | ended | AssignmentEnded |

## Invariants

- `assignment.oneHolderPerSeat`: another running or closing assignment holds this superagent and seat. Unique on superagent, seat, while running or closing; refused SeatTaken.
- `assignment.oneLivePerExecutor`: another pending, running or closing assignment holds this agent. Unique on agent, while pending or running or closing; refused ExecutorAlreadyQueued.

## Events

- `AssignmentEnded`: carries superagent (assignment.superagent), assignment (assignment.id), ticket (assignment.ticket), seat (assignment.seat); emitted by the move cancelled, turnEnded
- `AssignmentInterrupted`: carries superagent (assignment.superagent), assignment (assignment.id), ticket (assignment.ticket), agent (assignment.agent), seat (assignment.seat); emitted by the move interrupted
- `AssignmentPromoted`: carries superagent (assignment.superagent), assignment (assignment.id), ticket (assignment.ticket); emitted by the move promoted
- `AssignmentQueued`: carries superagent (assignment.superagent), assignment (assignment.id), ticket (assignment.ticket), input (assignment.input), why (assignment.why); emitted by the move queued
- `AssignmentStarted`: carries superagent (assignment.superagent), assignment (assignment.id), ticket (assignment.ticket), agent (assignment.agent), input (assignment.input), text (text), seat (assignment.seat), why (assignment.why); emitted by the move started

## Operations

- [assignment.cancelled](cancelled.md): End a pending Assignment that was never seated or told.
- [assignment.interrupted](interrupted.md): Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed.
- [assignment.promoted](promoted.md): A person's Input on a pending Assignment moves it up: its reason becomes a person's.
- [assignment.queued](queued.md): Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it.
- [assignment.started](started.md): Give a waiting Assignment a seat, if one is free for it.
- [assignment.turn-ended](turn-ended.md): The Agent idled on this Assignment or closed it: it ends, and its seat is free.
- [assignment.waiting](waiting.md): List assignments, oldest first, 255 to a page, filtered by superagent, the rows with why person ahead of the rest.
