<!-- Generated from the blueprint. Do not edit. -->
# supplier

Someone a company buys from and pays money to.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| supplierName | Name |
| supplierType | PartyKind |
| supplierGroup (optional) | supplier-group.id |

## Machine

States: active, disabled. A move from the wrong state is refused SupplierNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | SupplierCreated |
| disable | active | disabled | SupplierDisabled |
| enable | disabled | active | SupplierEnabled |

## Events

- `SupplierCreated`: carries supplier (supplier.id), company (supplier.company); emitted by the move create
- `SupplierDisabled`: carries supplier (supplier.id); emitted by the move disable
- `SupplierEnabled`: carries supplier (supplier.id); emitted by the move enable

## Operations

- [supplier.balance](balance.md): A supplier's balance on a day, from the ledger lines posted with it as their party.
- [supplier.create](create.md): Add a supplier to a company.
- [supplier.disable](disable.md): Disable a supplier: no payment to it can be submitted until it is enabled again.
- [supplier.enable](enable.md): Enable a disabled supplier again.
- [supplier.get](get.md): Read one supplier by its id: company, supplierName, supplierType, supplierGroup, state.
