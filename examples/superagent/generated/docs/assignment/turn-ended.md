<!-- Generated from the blueprint. Do not edit. -->
# assignment.turn-ended

The Agent idled on this Assignment or closed it: it ends, and its seat is free.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| assignment | assignment.id |

## Answer

(none)

## Move

`turnEnded`: from running or closing to ended, emitting AssignmentEnded.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AssignmentNotPending | 94 | AS-900 | the assignment is in a state turnEnded can't start from; carries `state` |
| AssignmentNotFound | 4 | AS-901 | nothing has the id in assignment; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment turn-ended --assignment <assignment>
```

HTTP: `POST /assignment/turn-ended` with the payload as JSON. SDK: `Sdk.assignment.turn-ended(payload)`.
