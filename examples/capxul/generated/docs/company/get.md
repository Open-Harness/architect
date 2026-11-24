<!-- Generated from the blueprint. Do not edit. -->
# company.get

Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.

**Who may call:** the owner of the company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | company.id |

## Answer

| field | value | description |
|---|---|---|
| companyName | company.companyName |  |
| abbr | company.abbr |  |
| country | company.country |  |
| defaultCurrency | company.defaultCurrency |  |
| owner | company.owner | The person who set the company up, and runs it. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of the company; the handler never runs |

## Worked examples

### branch names are the company's

Starts from the world `four branches`.

- **her first company is unchanged by its branchs.** `ada` (role company.owner) calls and sends id the world's company, and gets back [`Acme Trading`, `AT`, `Kenya`, `USD`, the cast's ada person, `active`].
- **and so is her second.** `ada` (role company.owner) calls and sends id the world's otherCompany, and gets back [`Acme Logistics`, `AL`, `Uganda`, `UGX`, the cast's ada person, `active`].
- **and Bo's.** `bo` (signed in) calls and sends id the world's boCompany, and gets back [`Bo Ltd`, `BL`, `Tanzania`, `TZS`, the cast's bo person, `active`].

### companies are kept apart

Starts from the world `a company`.

- **her second company reads back as she typed it, not as her first.** `ada` (role company.owner) calls and sends id the last call's company, and gets back [`Acme Holdings`, `AH`, `Uganda`, `UGX`, the cast's ada person, `active`].
- **Bo still can't read Ada's.** `bo` (signed in) calls and sends id the world's company, and is refused with NotAllowed, AR-001.
- **Ada's company is untouched and still hers.** `ada` (role company.owner) calls and sends id the world's company, and gets back [`Acme Trading`, `AT`, `Kenya`, `USD`, the cast's ada person, `active`].

### grade names are the company's

Starts from the world `four grades`.

- **her first company is unchanged by its grades.** `ada` (role company.owner) calls and sends id the world's company, and gets back [`Acme Trading`, `AT`, `Kenya`, `USD`, the cast's ada person, `active`].
- **and so is her second.** `ada` (role company.owner) calls and sends id the world's otherCompany, and gets back [`Acme Logistics`, `AL`, `Uganda`, `UGX`, the cast's ada person, `active`].
- **and Bo's.** `bo` (signed in) calls and sends id the world's boCompany, and gets back [`Bo Ltd`, `BL`, `Tanzania`, `TZS`, the cast's bo person, `active`].

### set up a company

Starts from an empty world.

- **Bo can't read a company he doesn't run.** `bo` (signed in) calls and sends id the last call's company, and is refused with NotAllowed, AR-001.
- **reading it back shows what she typed, with her as its owner.** `ada` (signed in) calls and sends id the last call's company, and gets back [`Acme Trading`, `AT`, `Kenya`, `USD`, the cast's ada person, `active`].
- **Ada can't read Bo's company.** `ada` (signed in) calls and sends id the last call's company, and is refused with NotAllowed, AR-001.
- **Bo reads his back, exactly as he typed it.** `bo` (signed in) calls and sends id the last call's company, and gets back [`Kilimanjaro Coffee Exporters`, `KCE`, `Tanzania`, `TZS`, the cast's bo person, `active`].

## How to call

```sh
capxul company get --id <id>
```

HTTP: `POST /company/get` with the payload as JSON. SDK: `Sdk.company.get(payload)`.
