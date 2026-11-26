<!-- Generated from the blueprint. Do not edit. -->
# assignment.promoted

A person's Input on a pending Assignment moves it up: its reason becomes a person's.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| assignment | assignment.id |

## Answer

(none)

## Move

`promoted`: from pending to pending, emitting AssignmentPromoted.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ExecutorAlreadyQueued | 97 | AS-003 | another pending, running or closing assignment holds this agent; by the rule assignment.oneLivePerExecutor, carrying agent |
| AssignmentNotPending | 94 | AS-900 | the assignment is in a state promoted can't start from; carries `state` |
| AssignmentNotFound | 4 | AS-901 | nothing has the id in assignment; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment promoted --assignment <assignment>
```

HTTP: `POST /assignment/promoted` with the payload as JSON. SDK: `Sdk.assignment.promoted(payload)`.
