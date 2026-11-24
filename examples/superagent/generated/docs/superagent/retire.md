<!-- Generated from the blueprint. Do not edit. -->
# superagent.retire

Close a superagent's connections and agents.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |

## Answer

(none)

## Move

`retire`: from observing or live or paused to retired, emitting SuperagentRetired.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotObserving | 60 | SU-900 | the superagent is in a state retire can't start from; carries `state` |
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent superagent retire --superagent <superagent>
```

HTTP: `POST /superagent/retire` with the payload as JSON. SDK: `Sdk.superagent.retire(payload)`.
