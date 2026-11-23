<!-- Generated from the blueprint. Do not edit. -->
# ticket.stop

Stop a ticket: its mandate is withdrawn and its executor's turn closed.

**Who may call:** anyone signed in, or the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | ticket.superagent |
| ticket | ticket.id |

## Answer

(none)

## Move

`stop`: from open or ended to stopped, emitting TicketStopped.

## Steps

- `ticket.stop.write` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SeatTaken | 96 | AS-002 | another running or closing assignment holds this superagent and seat; by the rule assignment.oneHolderPerSeat, carrying seat |
| ExecutorAlreadyQueued | 97 | AS-003 | another pending, running or closing assignment holds this agent; by the rule assignment.oneLivePerExecutor, carrying agent |
| TicketNotOpen | 90 | TI-900 | the ticket is in a state stop can't start from; carries `state` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent ticket stop --superagent <superagent> --ticket <ticket>
```

HTTP: `POST /ticket/stop` with the payload as JSON. SDK: `Sdk.ticket.stop(payload)`.
