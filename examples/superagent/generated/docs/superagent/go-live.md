<!-- Generated from the blueprint. Do not edit. -->
# superagent.go-live

Let a superagent act: a person, after reading what it would have accepted.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |

## Answer

(none)

## Move

`goLive`: from observing to live, emitting SuperagentWentLive.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotObserving | 60 | SU-900 | the superagent is in a state goLive can't start from; carries `state` |
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent superagent go-live --superagent <superagent>
```

HTTP: `POST /superagent/go-live` with the payload as JSON. SDK: `Sdk.superagent.go-live(payload)`.
