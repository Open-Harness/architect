<!-- Generated from the blueprint. Do not edit. -->
# question.answer

Answer a question with one of its letters.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | question.mission |
| question | question.id |
| picked | Letter |

## Answer

(none)

## Move

`answer`: from asked to answered, emitting QuestionAnswered.

## Steps

- `question.answer.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| QuestionNoSuchOption | 54 | QU-001 | declared in errors.ts |
| QuestionNotAsked | 53 | QU-900 | the question is in a state answer can't start from; carries `state` |
| QuestionNotFound | 4 | QU-901 | nothing has the id in question; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work question answer --mission <mission> --question <question> --picked <picked>
```

HTTP: `POST /question/answer` with the payload as JSON. SDK: `Sdk.question.answer(payload)`.
