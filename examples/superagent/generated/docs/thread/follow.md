<!-- Generated from the blueprint. Do not edit. -->
# thread.follow

The executor follows a thread: its next messages go straight to it, with no eval.

**Who may call:** the itsAgent of its ticket.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |
| thread | text |

## Answer

(none)

## Steps

- `thread.follow.write` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AlreadyFollowing | 93 | SB-001 | another live subscription holds this ticket and thread; by the rule subscription.oneFollowPerThread, carrying ticket, thread |
| NotAllowed | 3 | AR-001 | the caller isn't the itsAgent of its ticket; the handler never runs |

## How to call

```sh
superagent thread follow --ticket <ticket> --thread <thread>
```

HTTP: `POST /thread/follow` with the payload as JSON. SDK: `Sdk.thread.follow(payload)`.
