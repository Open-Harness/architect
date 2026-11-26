<!-- Generated from the blueprint. Do not edit. -->
# customer.get

Read one customer by its id: company, customerName, customerType, customerGroup, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | customer.id |

## Answer

| field | value |
|---|---|
| company | customer.company |
| customerName | customer.customerName |
| customerType | customer.customerType |
| customerGroup (optional) | customer.customerGroup |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Acme Trading's customer reads back an active company in its ledger group.** `ada` (role company.owner) calls and sends id the world's customer, and gets back [the world's company, `Kibo Stores`, `Company`, the world's customerGroup, `active`].
- **Acme Logistics' customer reads back there, in no group.** `ada` (role company.owner) calls and sends id the world's otherCustomer, and gets back [the world's otherCompany, `Kampala Traders`, `Company`, null, `active`].
- **Bo can't read Kibo Stores.** `bo` (signed in) calls and sends id the world's customer, and is refused with NotAllowed, AR-001.
- **she reads back as typed, in no group.** `ada` (role company.owner) calls and sends id the last call's customer, and gets back [the world's company, `Wanjiru Njoroge`, `Individual`, null, `active`].
- **it reads back a disabled partnership.** `ada` (role company.owner) calls and sends id the last call's customer, and gets back [the world's company, `Kibo Stores`, `Partnership`, the world's customerGroup, `disabled`].
- **and the first is still a company.** `ada` (role company.owner) calls and sends id the world's customer, and gets back [the world's company, `Kibo Stores`, `Company`, the world's customerGroup, `active`].
- **it reads back disabled, with the rest as it was.** `ada` (role company.owner) calls and sends id the world's customer, and gets back [the world's company, `Kibo Stores`, `Company`, the world's customerGroup, `disabled`].
- **Acme Logistics' customer is still active.** `ada` (role company.owner) calls and sends id the world's otherCustomer, and gets back `active`.

## How to call

```sh
capxul customer get --id <id>
```

HTTP: `POST /customer/get` with the payload as JSON. SDK: `Sdk.customer.get(payload)`.
