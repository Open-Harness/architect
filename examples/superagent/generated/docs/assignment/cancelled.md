<!-- Generated from the blueprint. Do not edit. -->
# assignment.cancelled

End a pending Assignment that was never seated or told.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| assignment | assignment.id |

## Answer

(none)

## Move

`cancelled`: from pending to ended, emitting AssignmentEnded.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AssignmentNotPending | 94 | AS-900 | the assignment is in a state cancelled can't start from; carries `state` |
| AssignmentNotFound | 4 | AS-901 | nothing has the id in assignment; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment cancelled --assignment <assignment>
```

HTTP: `POST /assignment/cancelled` with the payload as JSON. SDK: `Sdk.assignment.cancelled(payload)`.
