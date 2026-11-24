<!-- Generated from the blueprint. Do not edit. -->
# eval.read

Read one page of a thread, through its connection.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | eval.superagent |
| eval | eval.id |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| text | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EvalNotFound | 4 | EV-901 | nothing has the id in eval; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent eval read --superagent <superagent> --eval <eval> [--cursor <cursor>]
```

HTTP: `POST /eval/read` with the payload as JSON. SDK: `Sdk.eval.read(payload)`.
