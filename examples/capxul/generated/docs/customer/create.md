<!-- Generated from the blueprint. Do not edit. -->
# customer.create

Add a customer to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | customer.company |
| customerName | customer.customerName |
| customerType | customer.customerType |
| customerGroup (optional) | customer.customerGroup |

## Answer

| field | value |
|---|---|
| customer | customer.id |

## Move

`create`: from nothing (it creates) to active, emitting CustomerCreated.

## Steps

- `customer.create.load` (database)
- `customer.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CustomerGroupNotInCompany | 41 | CU-001 | declared in errors.ts |
| CustomerGroupIsGroup | 42 | CU-002 | declared in errors.ts |
| CustomerGroupNotFound | 4 | CG-901 | nothing has the id in customerGroup; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **nor add a customer to Acme Trading.** `bo` (signed in) calls and sends company the world's company, customerName `Bo's Shop`, customerType `Individual`, and is refused with NotAllowed, AR-001.
- **a customer put in a group that has groups under it is refused.** `ada` (role company.owner) calls and sends company the world's company, customerName `Duka Mart`, customerType `Company`, customerGroup the world's allCustomerGroups, and is refused with CustomerGroupIsGroup, CU-002.
- **a customer put in it is refused too: it is a group, though not the root.** `ada` (role company.owner) calls and sends company the world's company, customerName `Duka Mart`, customerType `Company`, customerGroup the last call's customerGroup, and is refused with CustomerGroupIsGroup, CU-002.
- **an Acme Trading customer in it is refused for its company before its being a group.** `ada` (role company.owner) calls and sends company the world's company, customerName `Duka Mart`, customerType `Company`, customerGroup the last call's customerGroup, and is refused with CustomerGroupNotInCompany, CU-001.
- **an Acme Logistics customer in Acme Trading's Commercial is refused.** `ada` (role company.owner) calls and sends company the world's otherCompany, customerName `Gulu Traders`, customerType `Company`, customerGroup the world's customerGroup, and is refused with CustomerGroupNotInCompany, CU-001.
- **Ada adds a customer, an individual in no group.** `ada` (role company.owner) calls and sends company the world's company, customerName `Wanjiru Njoroge`, customerType `Individual`, and gets back an answer matching `^cus_[0-9a-z]+$`.
- **a second customer of the same name is a customer of its own: two may share a name.** `ada` (role company.owner) calls and sends company the world's company, customerName `Kibo Stores`, customerType `Partnership`, customerGroup the world's customerGroup, and gets back an answer matching `^cus_[0-9a-z]+$`.

### post a payment entry

Starts from the world `a received advance`.

- **Ada adds a second customer of the same name.** `ada` (role company.owner) calls and sends company the world's company, customerName `Kibo Stores`, customerType `Company`, and gets back an answer matching `^cus_[0-9a-z]+$`.

## How to call

```sh
capxul customer create --company <company> --customerName <customerName> --customerType <customerType> [--customerGroup <customerGroup>]
```

HTTP: `POST /customer/create` with the payload as JSON. SDK: `Sdk.customer.create(payload)`.
