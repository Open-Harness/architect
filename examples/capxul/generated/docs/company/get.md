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

### set up a company

Starts from an empty world.

- **Bo can't read a company he doesn't run.** `bo` (signed in) calls and sends id the last call's company, and is refused with NotAllowed, AR-001.
- **reading it back shows what she typed, with her as its owner.** `ada` (signed in) calls and sends id the last call's company, and gets back [`Acme Trading`, `AT`, `Kenya`, `USD`, the cast's ada person, `active`].

## How to call

```sh
capxul company get --id <id>
```

HTTP: `POST /company/get` with the payload as JSON. SDK: `Sdk.company.get(payload)`.
