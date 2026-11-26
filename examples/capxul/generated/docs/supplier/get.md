<!-- Generated from the blueprint. Do not edit. -->
# supplier.get

Read one supplier by its id: company, supplierName, supplierType, supplierGroup, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | supplier.id |

## Answer

| field | value |
|---|---|
| company | supplier.company |
| supplierName | supplier.supplierName |
| supplierType | supplier.supplierType |
| supplierGroup (optional) | supplier.supplierGroup |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Mara Office Rentals reads back an active company in Services.** `ada` (role company.owner) calls and sends id the world's supplier, and gets back [the world's company, `Mara Office Rentals`, `Company`, the world's supplierGroup, `active`].
- **Nile Fuel reads back in Acme Logistics, in no group.** `ada` (role company.owner) calls and sends id the world's otherSupplier, and gets back [the world's otherCompany, `Nile Fuel`, `Company`, null, `active`].
- **Bo can't read Mara Office Rentals.** `bo` (signed in) calls and sends id the world's supplier, and is refused with NotAllowed, AR-001.
- **it reads back as typed.** `ada` (role company.owner) calls and sends id the last call's supplier, and gets back [the world's company, `Otieno Plumbing`, `Partnership`, null, `active`].
- **it reads back disabled.** `ada` (role company.owner) calls and sends id the world's supplier, and gets back [the world's company, `Mara Office Rentals`, `Company`, the world's supplierGroup, `disabled`].

## How to call

```sh
capxul supplier get --id <id>
```

HTTP: `POST /supplier/get` with the payload as JSON. SDK: `Sdk.supplier.get(payload)`.
