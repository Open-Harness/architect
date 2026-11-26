<!-- Generated from the blueprint. Do not edit. -->
# supplier.create

Add a supplier to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | supplier.company |
| supplierName | supplier.supplierName |
| supplierType | supplier.supplierType |
| supplierGroup (optional) | supplier.supplierGroup |

## Answer

| field | value |
|---|---|
| supplier | supplier.id |

## Move

`create`: from nothing (it creates) to active, emitting SupplierCreated.

## Steps

- `supplier.create.load` (database)
- `supplier.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SupplierGroupNotInCompany | 41 | SU-001 | declared in errors.ts |
| SupplierGroupIsGroup | 42 | SU-002 | declared in errors.ts |
| SupplierGroupNotFound | 4 | SG-901 | nothing has the id in supplierGroup; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **nor add a supplier.** `bo` (signed in) calls and sends company the world's company, supplierName `Bo's Vans`, supplierType `Individual`, and is refused with NotAllowed, AR-001.
- **a supplier in All Supplier Groups is refused: it is a group.** `ada` (role company.owner) calls and sends company the world's company, supplierName `Rift Paper`, supplierType `Company`, supplierGroup the world's allSupplierGroups, and is refused with SupplierGroupIsGroup, SU-002.
- **an Acme Trading supplier in it is refused for its company first.** `ada` (role company.owner) calls and sends company the world's company, supplierName `Rift Paper`, supplierType `Company`, supplierGroup the last call's supplierGroup, and is refused with SupplierGroupNotInCompany, SU-001.
- **an Acme Logistics supplier in Acme Trading's Services is refused.** `ada` (role company.owner) calls and sends company the world's otherCompany, supplierName `Jinja Tyres`, supplierType `Company`, supplierGroup the world's supplierGroup, and is refused with SupplierGroupNotInCompany, SU-001.
- **Ada adds Otieno Plumbing, a partnership in no group.** `ada` (role company.owner) calls and sends company the world's company, supplierName `Otieno Plumbing`, supplierType `Partnership`, and gets back an answer matching `^sup_[0-9a-z]+$`.
- **a second Mara Office Rentals is a supplier of its own.** `ada` (role company.owner) calls and sends company the world's company, supplierName `Mara Office Rentals`, supplierType `Individual`, supplierGroup the world's supplierGroup, and gets back false.

## How to call

```sh
capxul supplier create --company <company> --supplierName <supplierName> --supplierType <supplierType> [--supplierGroup <supplierGroup>]
```

HTTP: `POST /supplier/create` with the payload as JSON. SDK: `Sdk.supplier.create(payload)`.
