<!-- Generated from the blueprint. Do not edit. -->
# kra.get

Read one kra by its id: company, title, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | kra.id |

## Answer

| field | value |
|---|---|
| company | kra.company |
| title | kra.title |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## How to call

```sh
capxul kra get --id <id>
```

HTTP: `POST /kra/get` with the payload as JSON. SDK: `Sdk.kra.get(payload)`.
