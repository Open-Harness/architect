<!-- Generated from the blueprint. Do not edit. -->
# organization.create

Found an organisation. Whoever founds it owns it, and is its first member.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 250ms.

## Payload

| field | value |
|---|---|
| name | organization.name |

## Answer

| field | value |
|---|---|
| organization | organization.id |

## Move

`create`: from nothing (it creates) to active, emitting OrganizationCreated.

## Steps

- `organization.create.insert` (database)
- `organization.create.owner` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### an owner makes an api key

Starts from the world `founded`.

- **bob founds an organisation of his own.** `bob` (signed in) calls and sends name `Bob Co`, and gets back an answer matching `^org_[0-9a-z]+$`.

## How to call

```sh
starter organization create --name <name>
```

HTTP: `POST /organization/create` with the payload as JSON. SDK: `Sdk.organization.create(payload)`.
