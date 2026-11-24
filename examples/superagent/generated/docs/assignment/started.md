<!-- Generated from the blueprint. Do not edit. -->
# assignment.started

Give a waiting Assignment a seat, if one is free for it.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| assignment | assignment.id |
| seat | assignment.seat |

## Answer

| field | value |
|---|---|
| text | text |

## Move

`started`: from pending to running, emitting AssignmentStarted.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NoSeat | 95 | AS-001 | declared in errors.ts |
| SeatTaken | 96 | AS-002 | another running or closing assignment holds this superagent and seat; by the rule assignment.oneHolderPerSeat, carrying seat |
| ExecutorAlreadyQueued | 97 | AS-003 | another pending, running or closing assignment holds this agent; by the rule assignment.oneLivePerExecutor, carrying agent |
| AssignmentNotPending | 94 | AS-900 | the assignment is in a state started can't start from; carries `state` |
| AssignmentNotFound | 4 | AS-901 | nothing has the id in assignment; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment started --assignment <assignment> --seat <seat>
```

HTTP: `POST /assignment/started` with the payload as JSON. SDK: `Sdk.assignment.started(payload)`.
