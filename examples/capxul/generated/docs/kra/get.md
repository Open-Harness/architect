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

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **Quality is Acme Trading's KRA.** `ada` (role company.owner) calls and sends id the world's kra, and gets back [the world's company, `Quality`].

### set up kras and criteria

Starts from the world `three companies`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's kra, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's kra, and gets back [the world's company, `Quality`, `active`].
- **which reads back in Acme Logistics.** `ada` (role company.owner) calls and sends id the last call's kra, and gets back [the world's otherCompany, `Quality`].
- **Ada can't read Bo's.** `ada` (role company.owner) calls and sends id the last call's kra, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul kra get --id <id>
```

HTTP: `POST /kra/get` with the payload as JSON. SDK: `Sdk.kra.get(payload)`.
