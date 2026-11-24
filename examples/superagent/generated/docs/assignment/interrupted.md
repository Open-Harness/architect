<!-- Generated from the blueprint. Do not edit. -->
# assignment.interrupted

Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| assignment | assignment.id |

## Answer

(none)

## Move

`interrupted`: from running to closing, emitting AssignmentInterrupted.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SeatTaken | 96 | AS-002 | another running or closing assignment holds this superagent and seat; by the rule assignment.oneHolderPerSeat, carrying seat |
| ExecutorAlreadyQueued | 97 | AS-003 | another pending, running or closing assignment holds this agent; by the rule assignment.oneLivePerExecutor, carrying agent |
| AssignmentNotPending | 94 | AS-900 | the assignment is in a state interrupted can't start from; carries `state` |
| AssignmentNotFound | 4 | AS-901 | nothing has the id in assignment; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment interrupted --assignment <assignment>
```

HTTP: `POST /assignment/interrupted` with the payload as JSON. SDK: `Sdk.assignment.interrupted(payload)`.
