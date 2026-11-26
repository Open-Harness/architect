# CX-parties-payments: customers, suppliers, their groups, and payments with no invoice

**Decided 26 November 2026** by slice 7b's checks author (✍️ thread, session `session_01S8RF7CzjUDeQYqjk9ZY2xc`), under
Goal 16's lead (session `session_01S8RF7ASqmdxbN37WdpZMcB`), who set the scope: Customer, Supplier, their groups,
Party Type if needed, and Payment Entry for Receive and Pay with no invoice, posting its two ledger lines on submit,
reversing them on cancel, refusing a party of another company, and the party's balance read from the ledger. It builds
on CX-ledger (the chart, cost centers, fiscal years, journal entries and the general ledger).

The source is ERPNext at `a6f54f9c` (version-15), read and never run or copied. Paths below are under `erpnext/`:
`selling/doctype/customer/customer.{py,json}`, `buying/doctype/supplier/supplier.{py,json}`,
`setup/doctype/{customer_group,supplier_group,party_type}`, `accounts/doctype/payment_entry/payment_entry.{py,json}`,
`accounts/doctype/gl_entry/gl_entry.py`, `accounts/party.py`, `accounts/utils.py`, `accounts/general_ledger.py`,
`setup/setup_wizard/operations/install_fixtures.py`, and Frappe's `frappe/utils/nestedset.py` (version-15). The tests
read for journeys are `payment_entry/test_payment_entry.py`, `customer/test_customer.py` and
`supplier/test_supplier.py`.

## What 7b holds

The company's owner runs everything; employees have no access. Every amount is USDC in base units (`Amount`,
`Balance`), with no currency or rate field (CX-grill, section 3).

- **Customer Group** and **Supplier Group** (`group | ledger`, made as either): company, `customerGroupName` /
  `supplierGroupName` (unique in the company), an optional parent. One root per company.
- **Customer** and **Supplier** (`active ⇄ disabled`, by `disable` and `enable`): company, name, `customerType` /
  `supplierType` (Company, Individual or Partnership), an optional group. Each has `balance`, an operation with no move.
- **Party Type** is a value, not a thing: `Customer | Supplier`, each with its fixed account type (below).
- **Payment Entry** (`draft → submitted → cancelled`): company, `paymentType` (Receive or Pay), `postingDate`,
  `partyType`, `party` (a `cus_` or `sup_` id), `paidFrom`, `paidTo`, `paidAmount`, `costCenter`.
- **GL Entry** gains an optional `partyType` and `party`, set on the party's line and its reversal. `VoucherType`
  gains `Payment Entry`.

Starting worlds (journeys README): from `a liabilities group`, `a debtors ledger`, `a creditors ledger`, Acme
Logistics' `logistics assets`, `logistics debtors`, `logistics cost centers` and `logistics haulage`, then `all
customer groups`, `a customer group` (Commercial), `all supplier groups`, `a supplier group` (Services), `a customer`
(Kibo Stores), `a supplier` (Mara Office Rentals), `an outside customer` and `an outside supplier` (Acme Logistics'),
and `a received advance` (a draft of 500 USDC from Kibo Stores).

## The rules

| Rule | Whose | Where in ERPNext | Where here |
|---|---|---|---|
| A customer or supplier group's name is unique, here in its company (`…GroupNameTaken`) | ERPNext | `customer_group.json` line 35, `supplier_group.json` line 30 (`unique`) | the group's invariant |
| A group's parent is in its company (`Parent…GroupNotInCompany`), judged before whether the parent is a group, so a refusal says nothing about another company's group | Capxul's own: ERPNext's groups are site-wide | — | `…-group.create` |
| A group's parent is a group (`Parent…GroupIsLedger`) | ERPNext's form only offers groups as the parent; Capxul refuses on the server, as Account's `validate_parent` does | `customer_group.js` line 9 (the parent's query, `is_group: 1`) | `…-group.create` |
| A company has one root group (`…GroupRootExists`, carrying the root it has) | Frappe's NestedSet | `nestedset.py` lines 349–352, `validate_one_root`, called from `customer_group.py` `on_update` and `supplier_group.py` line 69 | `…-group.create` |
| A party's group is optional; given, it is the company's (`…GroupNotInCompany`, Capxul's own, judged before `is_group`) and a ledger (`…GroupIsGroup`), whether a root or a group below it | ERPNext | `customer.py` lines 416–424 and `supplier.py` lines 161–167; `test_supplier.py` lines 160 and 175 | `customer.create`, `supplier.create` |
| Two parties may share a name | ERPNext names them by a naming series | `customer.json` and `supplier.json` line 6 (`naming_series:`); `test_customer.py` line 255 | — |
| A party's account type: Customer → Receivable, Supplier → Payable | ERPNext's Party Type fixtures | `install_fixtures.py` lines 272–273 | `PartyType` |
| The party's account is Paid From on Receive and Paid To on Pay | ERPNext | `payment_entry.py` lines 75–88, `setup_party_account_field` | `payment-entry.create`, `.submit` |
| The party's account must have the party type's account type, whichever way the money goes (`PartyAccountWrongType`) | ERPNext | `payment_entry.py` lines 627–645, `validate_party_details`; `test_payment_entry.py` lines 168 and 2240 (money in from a supplier, from Creditors) | `payment-entry.create` |
| The party is a record of its party type (`PartyNotFound`), judged after the account type | ERPNext | `payment_entry.py` lines 646–647 | `payment-entry.create` |
| The party belongs to the payment's company (`PartyNotInCompany`) | Capxul's own: ERPNext's parties are site-wide | — | `payment-entry.create` |
| An amount of nothing is refused (`PaidAmountZero`), after the party | ERPNext | `payment_entry.py` lines 677–683, `validate_mandatory`, which `validate` runs after `validate_party_details` (lines 90–119) | `payment-entry.create` |
| Paid From, then Paid To, is the company's (`PaymentAccountNotInCompany`, carrying its side) and a ledger (`PaymentAccountIsGroup`); then the cost center is the company's and a ledger (`PaymentCostCenter…`). All four are judged first | ERPNext judges them on the GL Entry, on submit; Capxul on create, as CX-ledger does for journal entry lines | `gl_entry.py` lines 224–271, `validate_account_details`, `validate_cost_center` | `payment-entry.create` |
| Submit: the posting day falls in one of the company's fiscal years (`PaymentPostingDateOutsideFiscalYear`), then the party isn't disabled (`PartyDisabled`) | ERPNext, in the GL Entry's `validate` order | `gl_entry.py` lines 79–89 (`validate_and_set_fiscal_year`, then `validate_party`); `party.py` lines 878–886; `test_customer.py` line 240, `test_supplier.py` line 99 | `payment-entry.submit` |
| Submit posts two lines: the party's first (its account, party type and party; credited on Receive, debited on Pay), then the bank's (Paid To debited on Receive, Paid From credited on Pay; no party). Both carry the company, cost center, posting day, voucher type Payment Entry and the payment's id | ERPNext | `payment_entry.py` lines 1477–1496 (`build_gl_map`), 1514–1637 (`add_party_gl_entries`, the unallocated branch), 1760–1795 (`add_bank_gl_entries`) | `payment-entry.submit` |
| Cancel marks both lines cancelled and posts a reversal of each, debit and credit swapped, with the same party, also cancelled. Nothing is deleted | ERPNext, with the immutable ledger off (its default) | `payment_entry.py` lines 276–296; `general_ledger.py` line 707, `make_reverse_gl_entries` | `payment-entry.cancel` |
| Cancel refuses a disabled party (`PartyDisabled`): each reversal is saved as a GL Entry through `make_entry`, so its `validate` runs `validate_party` as on submit. Only `reconcile_against_document` sets `ignore_party_validation` | ERPNext | `general_ledger.py` lines 823 (`make_entry(new_gle, …, from_reversal=True)`) and 443–452 (`gle.submit()`); `gl_entry.py` lines 79–89 and 273–275; `party.py` lines 878–886; `utils.py` lines 462 and 479 | `payment-entry.cancel` |
| A party's balance on a day is debit less credit over every line not cancelled with it as the party, posted on or before the day | ERPNext | `utils.py` lines 180 and 280–284, `get_balance_on(party_type, party)`; `party.py` lines 970–982, `get_dashboard_info`; `test_payment_entry.py` line 1688 | `customer.balance`, `supplier.balance` |
| A party is disabled and enabled; the machine refuses disabling a disabled one and enabling an active one | ERPNext's `disabled` check, as a state | `customer.json`, `supplier.json` (`disabled`) | `customer.disable`, `.enable`, and the supplier's |

## Where Capxul departs from ERPNext

- **Parties and groups are each company's own.** ERPNext's are site-wide, with a Party Account row per company. Capxul's
  companies are separate organisations (K42, call 10), as CX-ledger decided for fiscal years. This is what makes
  `PartyNotInCompany`, `…GroupNotInCompany` and `Parent…GroupNotInCompany` reachable, and the one root per company.
- **The account and cost center checks are judged on create, and first.** ERPNext judges them when the GL Entry is
  saved on submit, and judges the party before them. Judging them first means no refusal says anything about another
  company's account, party or cost center, as CX-ledger's `ParentAccountNotInCompany` does. After them ERPNext's own
  order holds: the party's account type, then whether the party exists, then the amount.
- **`PartyDisabled` stays where ERPNext judges it,** on submit and on cancel (the GL Entry's `validate_party`), not on
  create: a payment to a disabled party may be drafted, and can be neither submitted nor cancelled until the party is
  enabled again.
- **The party's account is named on every payment.** ERPNext finds a default through `get_party_account` (the party's
  own Party Account row, then its group's, then the company's default receivable or payable, `party.py` lines 460–530)
  when none is given. Capxul has no Party Account rows and no company defaults yet, so the caller names it, and
  `PartyAccountWrongType` judges it. The defaults come with Party Account.
- **A cost center is required,** as every GL Entry here carries one (CX-ledger). ERPNext's is optional.
- **Party Type is a value.** ERPNext seeds four Party Type records at install; Capxul takes the two its books use, with
  their account types fixed. Employee and Shareholder come with expense claims, payroll and equity.
- **A group's parent must be a group** on the server, where ERPNext only filters the form.

## Two roots made at once

`…-group.create` judges the root by listing the company's groups with no parent. `Records.list` counts every matching
row as read, and the commit is a conflict when another call changed which rows match
(`packages/language-effect/src/modules/records/types.ts`, `list`). So two roots made at once for one company can't both
commit: the second is retried, sees the first, and is refused `…GroupRootExists`. No journey runs two calls at once,
so this rests on the store's rule, not on a check here.

## What is left for after the gaps

- **Allocating a payment against an invoice** (#972: a handler can't move a second thing's state). The payment's
  `references` table, `total_allocated_amount`, `unallocated_amount`, `difference_amount`, outstanding amounts,
  Payment Ledger Entry and reconciliation all wait on it and on invoices.
- **Sales and Purchase Invoices** (#742 item 4 / #879, a thing wider than D1's 100 columns).
- **Optional fields on insert** (#1044). Adding `partyType` and `party` to GL Entry makes the three built handlers that
  post GL Entries (`src/journal-entry/submit.ts` line 90, `cancel.ts` line 68, `src/payroll-entry/submit-slips.ts`
  line 142) fail to type-check, because `FieldsOf` types an optional field as required. The lead lands #1044's fix
  (checks #1048) into `goal/capxul` first; this branch then merges it in, and no built handler is edited here. The
  proofs ran on the type-stripped build, where the fields are simply left out.

Also later, not waiting on a gap: Internal Transfer; deductions, taxes and withholding; the reference number and date
a Bank payment needs (`payment_entry.py` lines 1410–1416); mode of payment; the received amount and exchange rates
(one asset, CX-grill); Party Account rows and the company's default receivable and payable accounts; freezing and
holds on a party; journal entry lines with a party (ERPNext requires one on a Receivable or Payable line, `gl_entry.py`
lines 133–148); credit limits, payment terms, price lists, contacts, addresses, loyalty and internal parties.

## Time

Nothing reads the world's clock. Every posting day is typed, so no journey moves it.

## Supersedes

- `design/decisions/CX-ledger.md`: "`voucherType` (Journal Entry for now)" → "`voucherType` (Journal Entry and Payment Entry)"
- `design/decisions/CX-ledger.md`: "GL Entry's party, against, remarks, fiscal year and currency columns" → "GL Entry's against, remarks, fiscal year and currency columns (its party and party type are taken, CX-parties-payments)"
