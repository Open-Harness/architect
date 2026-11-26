<!-- Generated from the blueprint. Do not edit. -->
# customer-group.get

Read one customer-group by its id: company, customerGroupName, parentCustomerGroup, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | customer-group.id |

## Answer

| field | value |
|---|---|
| company | customer-group.company |
| customerGroupName | customer-group.customerGroupName |
| parentCustomerGroup (optional) | customer-group.parentCustomerGroup |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up party groups

Starts from the world `a supplier group`.

- **the root customer group reads back Acme Trading's, a group with no parent.** `ada` (role company.owner) calls and sends id the world's allCustomerGroups, and gets back [the world's company, `All Customer Groups`, null, `group`].
- **the ledger customer group reads back under it.** `ada` (role company.owner) calls and sends id the world's customerGroup, and gets back [the world's company, `Commercial`, the world's allCustomerGroups, `ledger`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the world's customerGroup, and is refused with NotAllowed, AR-001.
- **it reads back a ledger under the new group, not under the root.** `ada` (role company.owner) calls and sends id the last call's customerGroup, and gets back [the world's company, `Corner Shops`, `ledger`] and gets back an answer matching `^cgr_[0-9a-z]+$`.
- **its parent reads back as the group made before it, a group under the root.** `ada` (role company.owner) calls and sends id the last call's parentCustomerGroup, and gets back [the world's company, `Retail`, the world's allCustomerGroups, `group`].
- **that ledger reads back in Acme Logistics, under its own root.** `ada` (role company.owner) calls and sends id the last call's customerGroup, and gets back [the world's otherCompany, `Commercial`, `ledger`] and gets back an answer matching `^cgr_[0-9a-z]+$`.
- **its parent reads back as Acme Logistics' root.** `ada` (role company.owner) calls and sends id the last call's parentCustomerGroup, and gets back [the world's otherCompany, `All Customer Groups`, null, `group`].

## How to call

```sh
capxul customer-group get --id <id>
```

HTTP: `POST /customer-group/get` with the payload as JSON. SDK: `Sdk.customer-group.get(payload)`.
