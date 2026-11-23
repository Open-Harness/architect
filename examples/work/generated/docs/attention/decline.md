<!-- Generated from the blueprint. Do not edit. -->
# attention.decline

Say not yet, and why. The task stays where its facts put it.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | attention.mission |
| attention | attention.id |
| why | Note |

## Answer

(none)

## Move

`decline`: from open to declined, emitting AttentionDeclined.

## Steps

- `attention.decline.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AttentionNotOpen | 55 | AT-900 | the attention is in a state decline can't start from; carries `state` |
| AttentionNotFound | 4 | AT-901 | nothing has the id in attention; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work attention decline --mission <mission> --attention <attention> --why <why>
```

HTTP: `POST /attention/decline` with the payload as JSON. SDK: `Sdk.attention.decline(payload)`.
