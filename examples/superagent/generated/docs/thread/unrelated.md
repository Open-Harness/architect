<!-- Generated from the blueprint. Do not edit. -->
# thread.unrelated

The executor says a thread has nothing to do with its ticket.

**Who may call:** the itsAgent of its ticket.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |
| thread | text |

## Answer

(none)

## Steps

- `thread.unrelated.write` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AlreadyFollowing | 93 | SB-001 | another live subscription holds this ticket and thread; by the rule subscription.oneFollowPerThread, carrying ticket, thread |
| NotAllowed | 3 | AR-001 | the caller isn't the itsAgent of its ticket; the handler never runs |

## How to call

```sh
superagent thread unrelated --ticket <ticket> --thread <thread>
```

HTTP: `POST /thread/unrelated` with the payload as JSON. SDK: `Sdk.thread.unrelated(payload)`.
