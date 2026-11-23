<!-- Generated from the blueprint. Do not edit. -->
# company.create

Set up a company; the person who sets it up runs it.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| companyName | company.companyName |
| abbr | company.abbr |
| country | company.country |
| defaultCurrency | company.defaultCurrency |

## Answer

| field | value |
|---|---|
| company | company.id |

## Move

`create`: from nothing (it creates) to active, emitting CompanyCreated.

## Steps

- `company.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### another company's department is refused

Starts from the world `a team`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Kenya`, defaultCurrency `KES`, and gets back an answer matching `^com_[0-9a-z]+$`.

### another company's job title is refused

Starts from the world `a team`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Kenya`, defaultCurrency `KES`, and gets back an answer matching `^com_[0-9a-z]+$`.

### set up a company

Starts from an empty world.

- **Ada sets up a company and runs it.** `ada` (signed in) calls and sends companyName `Acme Trading`, abbr `AT`, country `Kenya`, defaultCurrency `USD`, with the request key `acme`, and is answered.

### set up departments and job titles

Starts from the world `a company`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Kenya`, defaultCurrency `KES`, and gets back an answer matching `^com_[0-9a-z]+$`.

## How to call

```sh
capxul company create --companyName <companyName> --abbr <abbr> --country <country> --defaultCurrency <defaultCurrency>
```

HTTP: `POST /company/create` with the payload as JSON. SDK: `Sdk.company.create(payload)`.
