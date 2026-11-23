<!-- Generated from the blueprint. Do not edit. -->
# question.spike

Not sure yet: turn the question into a spike task on its subject.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | question.mission |
| question | question.id |

## Answer

(none)

## Move

`spike`: from asked to spiked, emitting QuestionSpiked.

## Steps

- `question.spike.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| QuestionNotAsked | 53 | QU-900 | the question is in a state spike can't start from; carries `state` |
| QuestionNotFound | 4 | QU-901 | nothing has the id in question; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work question spike --mission <mission> --question <question>
```

HTTP: `POST /question/spike` with the payload as JSON. SDK: `Sdk.question.spike(payload)`.
