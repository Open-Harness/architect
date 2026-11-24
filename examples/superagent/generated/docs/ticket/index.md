<!-- Generated from the blueprint. Do not edit. -->
# ticket

One piece of work a superagent was allowed to do, with the executor that works it.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| title | text |
| agent | agent.id |
| seq | uint |

## Machine

States: open, ended, stopped. A move from the wrong state is refused TicketNotOpen (exit 90).

| move | from | to | emits |
|---|---|---|---|
| accept | (creates) | open | TicketCreated |
| end | open | ended | TicketEnded |
| resume | ended | open | TicketResumed |
| stop | open, ended | stopped | TicketStopped |

## Events

- `TicketCreated`: carries superagent (ticket.superagent), ticket (ticket.id); emitted by the move accept
- `TicketEnded`: carries superagent (ticket.superagent), ticket (ticket.id); emitted by the move end
- `TicketResumed`: carries superagent (ticket.superagent), ticket (ticket.id); emitted by the move resume
- `TicketStopped`: carries superagent (ticket.superagent), ticket (ticket.id); emitted by the move stop

## Roles

- itsAgent

## Operations

- [ticket.accept](accept.md): Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit.
- [ticket.ack](ack.md): The executor acknowledges the message it was woken by, once, in one short reply.
- [ticket.attach](attach.md): Attach another thread to a ticket.
- [ticket.end](end.md): End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle.
- [ticket.note](note.md): Write a note on a ticket that does not wake its executor.
- [ticket.policy-changed](policy-changed.md): Tell the live tickets the policy changed under them.
- [ticket.report](report.md): The executor says how the work stands: progress, waiting, ready, blocked, failed or dropped.
- [ticket.request-status](request-status.md): Ask a ticket's executor where it stands; a person's request may use the seat kept for a person.
- [ticket.resume](resume.md): Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory.
- [ticket.retry](retry.md): Send a failed input again.
- [ticket.stage](stage.md): Read one ticket by its id: superagent, title, state.
- [ticket.stop](stop.md): Stop a ticket: its mandate is withdrawn and its executor's turn closed.
- [ticket.waiting](waiting.md): List tickets, newest first, 50 to a page, filtered by superagent, stage.
