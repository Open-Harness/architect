<!-- Generated from the blueprint. Do not edit. -->
# employment-type.get

Read one employment-type by its id: company, employmentTypeName, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employment-type.id |

## Answer

| field | value |
|---|---|
| company | employment-type.company |
| employmentTypeName | employment-type.employmentTypeName |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up employment types

Starts from the world `three companies`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's employmentType, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's employmentType, and gets back [the world's company, `Full-time`, `active`].
- **the second reads back under its own name.** `ada` (role company.owner) calls and sends id the last call's employmentType, and gets back [the world's company, `Contract`, `active`].
- **it reads back in Acme Logistics.** `ada` (role company.owner) calls and sends id the last call's employmentType, and gets back [the world's otherCompany, `Full-time`, `active`].
- **Ada can't read Bo's.** `ada` (role company.owner) calls and sends id the last call's employmentType, and is refused with NotAllowed, AR-001.
- **Bo reads his back, in Bo Ltd.** `bo` (signed in) calls and sends id the last call's employmentType, and gets back [the world's boCompany, `Full-time`, `active`].

## How to call

```sh
capxul employment-type get --id <id>
```

HTTP: `POST /employment-type/get` with the payload as JSON. SDK: `Sdk.employment-type.get(payload)`.
