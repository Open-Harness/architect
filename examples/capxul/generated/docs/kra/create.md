<!-- Generated from the blueprint. Do not edit. -->
# kra.create

Add a key result area to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | kra.company |
| title | kra.title |

## Answer

| field | value |
|---|---|
| kra | kra.id |

## Move

`create`: from nothing (it creates) to active, emitting KraCreated.

## Steps

- `kra.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KraTitleTaken | 41 | KR-001 | another kra holds this company and title; by the rule kra.oneTitlePerCompany, carrying title |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set up kras and criteria

Starts from the world `three companies`.

- **Ada adds a KRA to Acme Trading.** `ada` (role company.owner) calls and sends company the world's company, title `Quality`, and gets back an answer matching `^kra_[0-9a-z]+$`.
- **the same title can't be added to Acme Trading twice.** `ada` (role company.owner) calls and sends company the world's company, title `Quality`, and is refused with KraTitleTaken, KR-001, carrying title `Quality`.
- **but Acme Logistics may have its own.** `ada` (role company.owner) calls and sends company the world's otherCompany, title `Quality`, and gets back an answer matching `^kra_[0-9a-z]+$`.
- **Bo can't add a KRA to Acme Trading.** `bo` (signed in) calls and sends company the world's company, title `Speed`, and is refused with NotAllowed, AR-001.
- **Bo may use the title in Bo Ltd.** `bo` (signed in) calls and sends company the world's boCompany, title `Quality`, and gets back an answer matching `^kra_[0-9a-z]+$`.

## How to call

```sh
capxul kra create --company <company> --title <title>
```

HTTP: `POST /kra/create` with the payload as JSON. SDK: `Sdk.kra.create(payload)`.
