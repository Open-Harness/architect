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
| CompanyAbbrTaken | 42 | CO-002 | another company holds this owner and abbr; by the rule company.oneAbbrPerOwner, carrying abbr |
| CompanyNameTaken | 41 | CO-001 | another company holds this owner and company name; by the rule company.oneNamePerOwner, carrying companyName |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### another company's department is refused

Starts from the world `a team`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Kenya`, defaultCurrency `KES`, and gets back an answer matching `^com_[0-9a-z]+$`.

### another company's job title is refused

Starts from the world `a team`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Kenya`, defaultCurrency `KES`, and gets back an answer matching `^com_[0-9a-z]+$`.

### companies are kept apart

Starts from the world `a company`.

- **Ada can't give a second company of hers the same name.** `ada` (role company.owner) calls and sends companyName `Acme Trading`, abbr `AT2`, country `Kenya`, defaultCurrency `USD`, and is refused with CompanyNameTaken, CO-001, carrying companyName `Acme Trading`.
- **nor the same abbreviation.** `ada` (role company.owner) calls and sends companyName `Acme Holdings`, abbr `AT`, country `Kenya`, defaultCurrency `USD`, and is refused with CompanyAbbrTaken, CO-002, carrying abbr `AT`.
- **Bo may use both for his own company, because her names don't bind him.** `bo` (signed in) calls and sends companyName `Acme Trading`, abbr `AT`, country `Uganda`, defaultCurrency `UGX`, and gets back an answer matching `^com_[0-9a-z]+$`.
- **Ada sets up a second company under other names, which she runs too.** `ada` (role company.owner) calls and sends companyName `Acme Holdings`, abbr `AH`, country `Uganda`, defaultCurrency `UGX`, and gets back an answer matching `^com_[0-9a-z]+$`.

### set up a company

Starts from an empty world.

- **Ada sets up a company and runs it.** `ada` (signed in) calls and sends companyName `Acme Trading`, abbr `AT`, country `Kenya`, defaultCurrency `USD`, with the request key `acme`, and is answered.
- **Bo sets up a company of his own, which he runs.** `bo` (signed in) calls and sends companyName `Kilimanjaro Coffee Exporters`, abbr `KCE`, country `Tanzania`, defaultCurrency `TZS`, and gets back an answer matching `^com_[0-9a-z]+$`.

### set up branches

Starts from the world `a company`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Uganda`, defaultCurrency `UGX`, and gets back an answer matching `^com_[0-9a-z]+$`.

### set up departments and job titles

Starts from the world `a company`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Kenya`, defaultCurrency `KES`, and gets back an answer matching `^com_[0-9a-z]+$`.

### set up grades

Starts from the world `a company`.

- **Bo sets up a company of his own.** `bo` (signed in) calls and sends companyName `Bo Ltd`, abbr `BL`, country `Uganda`, defaultCurrency `UGX`, and gets back an answer matching `^com_[0-9a-z]+$`.

## How to call

```sh
capxul company create --companyName <companyName> --abbr <abbr> --country <country> --defaultCurrency <defaultCurrency>
```

HTTP: `POST /company/create` with the payload as JSON. SDK: `Sdk.company.create(payload)`.
