<!-- Generated from the blueprint. Do not edit. -->
# ticket.accept

Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit.

**Who may call:** the listed of its account.

## Payload

| field | value |
|---|---|
| superagent | ticket.superagent |
| account | account.id |
| title | ticket.title |
| agent | ticket.agent |
| thread | text |
| text | text |

## Answer

| field | value |
|---|---|
| ticket | ticket.id |

## Move

`accept`: from nothing (it creates) to open, emitting TicketCreated.

## Steps

- `ticket.accept.write` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SeatTaken | 96 | AS-002 | another running or closing assignment holds this superagent and seat; by the rule assignment.oneHolderPerSeat, carrying seat |
| ExecutorAlreadyQueued | 97 | AS-003 | another pending, running or closing assignment holds this agent; by the rule assignment.oneLivePerExecutor, carrying agent |
| AlreadyFollowing | 93 | SB-001 | another live subscription holds this ticket and thread; by the rule subscription.oneFollowPerThread, carrying ticket, thread |
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| AgentNotFound | 4 | AG-901 | nothing has the id in agent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the listed of its account; the handler never runs |

## How to call

```sh
superagent ticket accept --superagent <superagent> --account <account> --title <title> --agent <agent> --thread <thread> --text <text>
```

HTTP: `POST /ticket/accept` with the payload as JSON. SDK: `Sdk.ticket.accept(payload)`.
