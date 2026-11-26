<!-- Generated from the blueprint. Do not edit. -->
# payment-entry.create

Draft a payment received from a party or paid to one, with no invoice: an advance.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| company | payment-entry.company |
| paymentType | payment-entry.paymentType |
| postingDate | payment-entry.postingDate |
| partyType | payment-entry.partyType |
| party | payment-entry.party |
| paidFrom | payment-entry.paidFrom |
| paidTo | payment-entry.paidTo |
| paidAmount | payment-entry.paidAmount |
| costCenter | payment-entry.costCenter |

## Answer

| field | value |
|---|---|
| paymentEntry | payment-entry.id |

## Move

`create`: from nothing (it creates) to draft, emitting PaymentEntryDrafted.

## Steps

- `payment-entry.create.load` (database)
- `payment-entry.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PaymentAccountNotInCompany | 41 | PY-001 | declared in errors.ts, carrying side |
| PaymentAccountIsGroup | 42 | PY-002 | declared in errors.ts, carrying side |
| PaymentCostCenterNotInCompany | 43 | PY-003 | declared in errors.ts |
| PaymentCostCenterIsGroup | 44 | PY-004 | declared in errors.ts |
| PartyAccountWrongType | 45 | PY-005 | declared in errors.ts |
| PartyNotFound | 46 | PY-006 | declared in errors.ts |
| PartyNotInCompany | 47 | PY-007 | declared in errors.ts |
| PaidAmountZero | 48 | PY-008 | declared in errors.ts |
| AccountNotFound | 4 | AC-901 | nothing has the id in paidFrom, paidTo; the handler never runs; carries `id` |
| CostCenterNotFound | 4 | CC-901 | nothing has the id in costCenter; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### draft a payment entry

Starts from the world `an outside supplier`.

- **Bo can't draft a payment for Acme Trading.** `bo` (signed in) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with NotAllowed, AR-001.
- **Paid From in another company is refused, carrying its side.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's otherDebtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountNotInCompany, PY-001, carrying side `Paid From`.
- **a group account there is refused.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's assets, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountIsGroup, PY-002, carrying side `Paid From`.
- **another company's group there is refused for its company first.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's otherAssets, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountNotInCompany, PY-001, carrying side `Paid From`.
- **Paid To in another company is refused, carrying its side.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's otherDebtors, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountNotInCompany, PY-001, carrying side `Paid To`.
- **a group account there is refused.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's liabilities, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountIsGroup, PY-002, carrying side `Paid To`.
- **Paid From is judged before Paid To: a group there and another company's account here.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's assets, paidTo the world's otherDebtors, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountIsGroup, PY-002, carrying side `Paid From`.
- **and another company's account there before a group here.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's otherDebtors, paidTo the world's liabilities, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PaymentAccountNotInCompany, PY-001, carrying side `Paid From`.
- **on Pay the bank is Paid From, and judged there.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's assets, paidTo the world's creditors, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PaymentAccountIsGroup, PY-002, carrying side `Paid From`.
- **and the party's account is Paid To.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's otherDebtors, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PaymentAccountNotInCompany, PY-001, carrying side `Paid To`.
- **a cost center in another company is refused.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's haulage, and is refused with PaymentCostCenterNotInCompany, PY-003.
- **a group cost center is refused.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's mainCostCenter, and is refused with PaymentCostCenterIsGroup, PY-004.
- **a group account below the root is refused too.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's operating, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PaymentAccountIsGroup, PY-002, carrying side `Paid To`.
- **a group cost center below the root is refused.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the last call's costCenter, and is refused with PaymentCostCenterIsGroup, PY-004.
- **another company's group cost center is refused for its company first.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's otherCostCenterGroup, and is refused with PaymentCostCenterNotInCompany, PY-003.
- **the accounts are judged before the cost center.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's liabilities, paidAmount `500000000`, costCenter the world's haulage, and is refused with PaymentAccountIsGroup, PY-002, carrying side `Paid To`.
- **a customer's money in can't come from a Payable account.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's creditors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **nor from a Bank account.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's bank, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **nor from an account with no type.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's rent, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **a supplier's money out can't go to a Receivable account.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's debtors, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **money in from a supplier comes from Payable, not Receivable.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's debtors, paidTo the world's bank, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **money out to a customer goes to Receivable, not Payable.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's bank, paidTo the world's creditors, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **the cost center is judged before the party's account.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's creditors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's mainCostCenter, and is refused with PaymentCostCenterIsGroup, PY-004.
- **a supplier named as a customer isn't found.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's supplier, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyNotFound, PY-006.
- **nor a customer named as a supplier.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's customer, paidFrom the world's bank, paidTo the world's creditors, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PartyNotFound, PY-006.
- **nor a party nobody added.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party `cus_0000000000000000000000000`, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyNotFound, PY-006.
- **the party's account is judged before the party.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's supplier, paidFrom the world's creditors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **Acme Logistics' customer can't pay Acme Trading.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's otherCustomer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is refused with PartyNotInCompany, PY-007.
- **nor can Acme Trading pay Acme Logistics' supplier.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's otherSupplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PartyNotInCompany, PY-007.
- **a party of another company is judged after the party's account.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's otherSupplier, paidFrom the world's bank, paidTo the world's debtors, paidAmount `200000000`, costCenter the world's costCenter, and is refused with PartyAccountWrongType, PY-005.
- **an amount of nothing is refused.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `0`, costCenter the world's costCenter, and is refused with PaidAmountZero, PY-008.
- **on Pay too.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `0`, costCenter the world's costCenter, and is refused with PaidAmountZero, PY-008.
- **after the party.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's otherCustomer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `0`, costCenter the world's costCenter, and is refused with PartyNotInCompany, PY-007.
- **and after a party not found.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's customer, paidFrom the world's bank, paidTo the world's creditors, paidAmount `0`, costCenter the world's costCenter, and is refused with PartyNotFound, PY-006.
- **Ada drafts 500 USDC received from Kibo Stores.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and gets back an answer matching `^pen_[0-9a-z]+$`.
- **Ada drafts 200 USDC paid to Mara Office Rentals.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `200000000`, costCenter the world's costCenter, and is answered.
- **money in from a supplier, from Creditors, may be drafted: a refund.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's creditors, paidTo the world's bank, paidAmount `50000000`, costCenter the world's costCenter, and is answered.
- **and money out to a customer, to Debtors.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Pay`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's bank, paidTo the world's debtors, paidAmount `1`, costCenter the world's costCenter, and is answered.
- **the side the money reaches isn't judged for its type: a ledger with none may take it.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's rent, paidAmount `500000000`, costCenter the world's costCenter, and is answered.
- **a date outside every fiscal year may be drafted: it is judged on submit.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2025-06-30`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is answered.
- **a payment from a disabled customer may still be drafted: that too is judged on submit.** `ada` (role company.owner) calls and sends company the world's company, paymentType `Receive`, postingDate `2026-02-10`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `500000000`, costCenter the world's costCenter, and is answered.

### post a payment entry

Starts from the world `a received advance`.

- **Ada drafts 200 USDC paid to Mara Office Rentals on 5 March.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Pay`, postingDate `2026-03-05`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `200000000`, and is answered.
- **Mara Office Rentals refunds 50 USDC on 20 March, from Creditors to Bank.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2026-03-20`, partyType `Supplier`, party the world's supplier, paidFrom the world's creditors, paidTo the world's bank, paidAmount `50000000`, and is answered.
- **Mara Office Rentals refunds 20 USDC on 25 March.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2026-03-25`, partyType `Supplier`, party the world's supplier, paidFrom the world's creditors, paidTo the world's bank, paidAmount `20000000`, and is answered.
- **Ada pays Kibo Stores 100 USDC on 1 April, from Bank to Debtors.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Pay`, postingDate `2026-04-01`, partyType `Customer`, party the world's customer, paidFrom the world's bank, paidTo the world's debtors, paidAmount `100000000`, and is answered.
- **and receives 70 USDC from it on 2 April.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2026-04-02`, partyType `Customer`, party the last call's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `70000000`, and is answered.
- **Ada drafts a payment from Kibo Stores on 31 December 2025.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2025-12-31`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `10000000`, and is answered.
- **nor on 1 January 2027.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2027-01-01`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `10000000`, and is answered.
- **Ada drafts Acme Trading's payment on 1 March 2027.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2027-03-01`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `10000000`, and is answered.
- **the year's first day posts.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2026-01-01`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `1`, and is answered.
- **and its last.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2026-12-31`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `1`, and is answered.
- **a payment on 15 January 2029, inside it.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2029-01-15`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `3`, and is answered.
- **a payment on 15 March 2028, before it begins.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2028-03-15`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `3`, and is answered.
- **and one on 15 March 2029, after it ends.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2029-03-15`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `3`, and is answered.
- **a payment to it in 2027 may be drafted.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Pay`, postingDate `2027-01-04`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `30000000`, and is answered.
- **one in May 2026 may be drafted.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Pay`, postingDate `2026-05-04`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `30000000`, and is answered.
- **and drafts the May payment again.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Pay`, postingDate `2026-05-04`, partyType `Supplier`, party the world's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `30000000`, and is answered.
- **and pays it 40 USDC on 6 March, to Creditors.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Pay`, postingDate `2026-03-06`, partyType `Supplier`, party the last call's supplier, paidFrom the world's bank, paidTo the world's creditors, paidAmount `40000000`, and is answered.
- **a payment from it may be drafted.** `ada` (role company.owner) calls and sends company the world's company, costCenter the world's costCenter, paymentType `Receive`, postingDate `2026-06-01`, partyType `Customer`, party the world's customer, paidFrom the world's debtors, paidTo the world's bank, paidAmount `5000000`, and is answered.

## How to call

```sh
capxul payment-entry create --company <company> --paymentType <paymentType> --postingDate <postingDate> --partyType <partyType> --party <party> --paidFrom <paidFrom> --paidTo <paidTo> --paidAmount <paidAmount> --costCenter <costCenter>
```

HTTP: `POST /payment-entry/create` with the payload as JSON. SDK: `Sdk.payment-entry.create(payload)`.
