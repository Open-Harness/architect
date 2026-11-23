<!-- Generated from the blueprint. Do not edit. -->
# superagent.resume

Let held work go, and move every eval's deadline later by the pause's length. Only a person, through a session.

**Who may call:** anyone signed in by session.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |

## Answer

| field | value |
|---|---|
| to | text |
| at | uint |
| length | uint |

## Move

`resume`: from paused to observing or live, emitting SuperagentResumed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotObserving | 60 | SU-900 | the superagent is in a state resume can't start from; carries `state` |
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in by session; the handler never runs |

## How to call

```sh
superagent superagent resume --superagent <superagent>
```

HTTP: `POST /superagent/resume` with the payload as JSON. SDK: `Sdk.superagent.resume(payload)`.
