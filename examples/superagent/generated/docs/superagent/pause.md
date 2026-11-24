<!-- Generated from the blueprint. Do not edit. -->
# superagent.pause

Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session.

**Who may call:** anyone signed in by session.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |

## Answer

| field | value |
|---|---|
| from | text |
| at | uint |

## Move

`pause`: from observing or live to paused, emitting SuperagentPaused.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotObserving | 60 | SU-900 | the superagent is in a state pause can't start from; carries `state` |
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in by session; the handler never runs |

## How to call

```sh
superagent superagent pause --superagent <superagent>
```

HTTP: `POST /superagent/pause` with the payload as JSON. SDK: `Sdk.superagent.pause(payload)`.
