<!-- Generated from the blueprint. Do not edit. -->
# assignment.queued

Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | assignment.superagent |
| ticket | assignment.ticket |
| agent | assignment.agent |
| input | assignment.input |
| why | assignment.why |

## Answer

| field | value |
|---|---|
| assignment | assignment.id |

## Move

`queued`: from nothing (it creates) to pending, emitting AssignmentQueued.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ExecutorAlreadyQueued | 97 | AS-003 | another pending, running or closing assignment holds this agent; by the rule assignment.oneLivePerExecutor, carrying agent |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| AgentNotFound | 4 | AG-901 | nothing has the id in agent; the handler never runs; carries `id` |
| InputNotFound | 4 | IN-901 | nothing has the id in input; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment queued --superagent <superagent> --ticket <ticket> --agent <agent> --input <input> --why <why>
```

HTTP: `POST /assignment/queued` with the payload as JSON. SDK: `Sdk.assignment.queued(payload)`.
