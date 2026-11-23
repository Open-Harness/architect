<!-- Generated from the blueprint. Do not edit. -->
# organization.get

Read one organization by its id: name, owner, state.

**Who may call:** the owner of the organization.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | organization.id |

## Answer

| field | value |
|---|---|
| name | organization.name |
| owner | organization.owner |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of the organization; the handler never runs |

## Worked examples

### an owner makes an api key

Starts from the world `founded`.

- **ada can't read bob's organisation.** `ada` (role organization.owner) calls and sends id the last call's organization, and is refused with NotAllowed, AR-001.

### invite and accept

Starts from the world `founded`.

- **ada reads her organisation.** `ada` (role organization.owner) calls and sends id the world's organization, and gets back `Acme Demo` and gets back the cast's ada person and gets back `active`.

## How to call

```sh
starter organization get --id <id>
```

HTTP: `POST /organization/get` with the payload as JSON. SDK: `Sdk.organization.get(payload)`.
