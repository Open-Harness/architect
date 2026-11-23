<!-- Generated from the blueprint. Do not edit. -->
# question.ask

Ask the mission's owner about one gap in the blueprint, with lettered answers.

**Who may call:** the owner of its mission.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| mission | question.mission |
| asks | question.asks |
| about | question.about |
| gap | question.gap |
| options | question.options |

## Answer

| field | value |
|---|---|
| question | question.id |

## Move

`ask`: from nothing (it creates) to asked, emitting QuestionAsked.

## Steps

- `question.ask.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionNotInIntake | 53 | MS-003 | the question is in a state ask can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
work question ask --mission <mission> --asks <asks> --about <about> --gap <gap> --options <options>
```

HTTP: `POST /question/ask` with the payload as JSON. SDK: `Sdk.question.ask(payload)`.
