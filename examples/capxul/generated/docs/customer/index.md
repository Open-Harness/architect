<!-- Generated from the blueprint. Do not edit. -->
# customer

Someone a company sells to and receives money from.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| customerName | Name |
| customerType | PartyKind |
| customerGroup (optional) | customer-group.id |

## Machine

States: active, disabled. A move from the wrong state is refused CustomerNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | CustomerCreated |
| disable | active | disabled | CustomerDisabled |
| enable | disabled | active | CustomerEnabled |

## Events

- `CustomerCreated`: carries customer (customer.id), company (customer.company); emitted by the move create
- `CustomerDisabled`: carries customer (customer.id); emitted by the move disable
- `CustomerEnabled`: carries customer (customer.id); emitted by the move enable

## Operations

- [customer.balance](balance.md): A customer's balance on a day, from the ledger lines posted with it as their party.
- [customer.create](create.md): Add a customer to a company.
- [customer.disable](disable.md): Disable a customer: no payment from it can be submitted until it is enabled again.
- [customer.enable](enable.md): Enable a disabled customer again.
- [customer.get](get.md): Read one customer by its id: company, customerName, customerType, customerGroup, state.
