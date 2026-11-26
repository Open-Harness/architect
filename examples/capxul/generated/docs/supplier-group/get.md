<!-- Generated from the blueprint. Do not edit. -->
# supplier-group.get

Read one supplier-group by its id: company, supplierGroupName, parentSupplierGroup, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | supplier-group.id |

## Answer

| field | value |
|---|---|
| company | supplier-group.company |
| supplierGroupName | supplier-group.supplierGroupName |
| parentSupplierGroup (optional) | supplier-group.parentSupplierGroup |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up party groups

Starts from the world `a supplier group`.

- **the root supplier group reads back Acme Trading's.** `ada` (role company.owner) calls and sends id the world's allSupplierGroups, and gets back [the world's company, `All Supplier Groups`, null, `group`].
- **the ledger supplier group reads back under it.** `ada` (role company.owner) calls and sends id the world's supplierGroup, and gets back [the world's company, `Services`, the world's allSupplierGroups, `ledger`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the world's supplierGroup, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's supplierGroup, and gets back [the world's company, `Raw Materials`, the world's allSupplierGroups, `ledger`].
- **the ledger reads back in Acme Trading.** `ada` (role company.owner) calls and sends id the last call's supplierGroup, and gets back [the world's company, `Water`, `ledger`].
- **its parent reads back as the group made before it, under the root.** `ada` (role company.owner) calls and sends id the last call's parentSupplierGroup, and gets back [the world's company, `Utilities`, the world's allSupplierGroups, `group`].

## How to call

```sh
capxul supplier-group get --id <id>
```

HTTP: `POST /supplier-group/get` with the payload as JSON. SDK: `Sdk.supplier-group.get(payload)`.
