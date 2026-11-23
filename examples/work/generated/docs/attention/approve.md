<!-- Generated from the blueprint. Do not edit. -->
# attention.approve

Say yes. For a promote, the promote runs.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | attention.mission |
| attention | attention.id |

## Answer

(none)

## Move

`approve`: from open to approved, emitting AttentionApproved.

## Steps

- `attention.approve.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AttentionNotOpen | 55 | AT-900 | the attention is in a state approve can't start from; carries `state` |
| AttentionNotFound | 4 | AT-901 | nothing has the id in attention; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work attention approve --mission <mission> --attention <attention>
```

HTTP: `POST /attention/approve` with the payload as JSON. SDK: `Sdk.attention.approve(payload)`.
