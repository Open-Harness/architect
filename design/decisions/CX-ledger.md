# CX-ledger: fiscal years, the chart, cost centers, journal entries and the general ledger

**Decided 25 November 2026** by slice 7a's checks author (thread T-01a210a2-e558-7743-a17a-de8942de662d), under Goal
16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), who set the scope. The source is ERPNext at `a6f54f9c`
(`erpnext/accounts/doctype/{fiscal_year,account,cost_center,journal_entry,journal_entry_account,gl_entry}`,
`erpnext/accounts/general_ledger.py`, `erpnext/accounts/utils.py` for `get_fiscal_year` and `get_balance_on`, and
`erpnext/controllers/accounts_controller.py` for `validate_account_head`). Where the scope and the source differed, the
source won. Each difference is listed below.

## What 7a holds

The company's owner runs everything, and employees have no access. Every amount is USDC in base units (`Amount`, and
`Balance` for a signed balance). No field holds a currency or a rate (CX-grill, section 3).

- **Fiscal Year** (`active`): company, `year` (its name, unique in the company), `yearStartDate`, `yearEndDate`,
  `isShortYear`.
- **Account** (`group | ledger`, and `group → ledger`): company, `accountName` (unique in the company), an optional
  `parentAccount`, `rootType`, `reportType` and an optional `accountType` (Bank, Cash, Receivable, Payable or Tax).
- **Cost Center** (`group | ledger`): company, `costCenterName` (unique in the company), an optional
  `parentCostCenter`.
- **Journal Entry** (`draft → submitted → cancelled`): company, `postingDate`, `userRemark`, `totalDebit`,
  `totalCredit`.
- **Journal Entry Account**: `journalEntry`, `line` (from 1), account, cost center, debit, credit. It has no machine and
  no operation of its own. Only the entry's create writes it.
- **GL Entry**: company, account, cost center, `postingDate`, debit, credit, `voucherType` (Journal Entry for now),
  `voucherId`, `isCancelled`. It has no machine and no operation of its own. Only a voucher's submit and cancel write it
  (`writes: [JournalEntry, GLEntry]`, CX-takeover).
- **Reads:** each thing by id; `journal-entry-account.list` by entry (the entry's lines); `gl-entry.list` by account,
  optionally by voucher (an account's ledger lines, cancelled ones too); and `account.balance`, an operation with no
  move (below).

Starting worlds seed a small chart: Assets > Bank; Equity > Capital Stock; Expenses > Operating Expenses > Rent; cost
centers Acme Trading > Operations; then the fiscal year 2026; then a draft opening-capital entry. Chart templates are
left out.

## The rules

| Rule | Whose | Where |
|---|---|---|
| A fiscal year's end isn't before its start (`FiscalYearEndsBeforeStart`). A one-day year is allowed | ERPNext, Frappe's `validate_from_to_dates` | `fiscal-year.create` |
| A year not marked short ends exactly the day before the same date a year on, by `relativedelta`, so a year from a leap day ends on 27 February (`FiscalYearWrongLength`, carrying that day) | ERPNext, `validate_dates` | `fiscal-year.create` |
| A short year ends no later than that day | Capxul's own: ERPNext judges nothing for a short year | `fiscal-year.create` |
| A year shares no day, both ends counted, with another of the company's years (`FiscalYearOverlaps`, carrying the earliest-starting one) | ERPNext, `validate_overlap` | `fiscal-year.create` |
| An account's parent is in its company (`ParentAccountNotInCompany`), then is a group (`ParentAccountIsLedger`) | ERPNext, `validate_parent`; Capxul judges the company first | `account.create` |
| A root account is a group (`RootAccountIsLedger`) and names its root type (`RootTypeMissing`) | ERPNext, `validate_root_details`, `validate_mandatory` | `account.create` |
| A child carries its parent's root type; naming another is refused (`RootTypeNotParents`, carrying the parent's) | ERPNext overwrites it silently (`set_root_and_report_type`); Capxul refuses | `account.create` |
| The report type follows the root type: Asset, Liability and Equity on the Balance Sheet, Income and Expense in Profit and Loss | ERPNext, `set_root_and_report_type` | `account.create` |
| A group with an account under it can't become a ledger (`AccountHasChildren`) | ERPNext, `convert_group_to_ledger` | `account.make-ledger` |
| A cost center's parent is in its company (`ParentCostCenterNotInCompany`), then is a group (`ParentCostCenterIsLedger`); a root is a group (`RootCostCenterIsLedger`) | the group check is ERPNext's; the company check and the root rule are Capxul's own, after Account | `cost-center.create` |
| An entry has at least two lines (`JournalEntryTooFewLines`) | ERPNext refuses an empty table on save and a single ledger line on submit; Capxul refuses both on create | `journal-entry.create` |
| Line by line: the account is the company's (`LineAccountNotInCompany`) and a ledger (`LineAccountIsGroup`), then the cost center is the company's (`LineCostCenterNotInCompany`) and a ledger (`LineCostCenterIsGroup`) | ERPNext, `validate_account_head` on save; the cost center's from the GL Entry's `validate_cost_center`, moved to create | `journal-entry.create` |
| Then over every line: not neither (`LineWithoutAmount`); then over every line: not both (`LineDebitAndCredit`). Each line refusal carries the first line, from 1 | ERPNext, `validate_debit_credit_amount` then `set_total_debit_credit` | `journal-entry.create` |
| A draft may be unbalanced | ERPNext judges balance in `before_submit` | `journal-entry.create` |
| Submit: debit equals credit (`JournalEntryUnbalanced`, carrying debit less credit, signed), then the posting day falls in one of the company's own fiscal years, both ends counted (`PostingDateOutsideFiscalYear`) | ERPNext, `validate_total_debit_and_credit`, then `get_fiscal_year` | `journal-entry.submit` |
| Submit posts one GL Entry per line, with the entry's company and posting day; lines on the same account aren't merged | ERPNext, `make_gl_entries`; `merge_similar_account_heads` is off by default | `journal-entry.submit` |
| Cancel marks every line the submit posted `isCancelled`, and posts a reversal of each, debit and credit swapped, on the same account, cost center and day, also `isCancelled`. Nothing is deleted | ERPNext, `make_reverse_gl_entries` with the immutable ledger off (its default) | `journal-entry.cancel` |
| A balance on a day is the sum of every line not cancelled, posted on or before it, to the account and, for a group, to every account anywhere under it; `balance` is debit less credit | ERPNext, `get_balance_on` | `account.balance` |

## Where the source changed the scope (core: please confirm)

- **Cancel marks the originals cancelled.** The scope left it open. ERPNext's default marks both the original and the
  reversal `is_cancelled`, so neither counts in a balance and both stay in the ledger. Capxul does the same. A build
  that deletes the originals, or leaves them uncancelled, fails `post a journal entry`.
- **A fiscal year is per company.** ERPNext keeps one year for the site and lists its companies (Fiscal Year Company).
  Capxul's companies are separate organisations (K42, call 10), so each keeps its own years, its names are unique per
  company, and only a company's own years count for overlap and for posting.
- **`isShortYear` is a field.** The scope's "longer than one year less a day" is ERPNext's rule only for a year not
  marked short, and that year must be exactly a year less a day, not merely no longer. A short year is ERPNext's way to
  allow less; Capxul bounds it at a year.
- **A child naming another root type is refused**, where ERPNext overwrites it. The form keeps the field read-only in
  ERPNext, so only an API caller reaches it, and silently changing what a caller named is worse than refusing.
- **Group or ledger is a state.** ERPNext's `is_group` is a field with two conversions. Here `create` picks the state,
  and `make-ledger` is the one conversion the scope asks for (a group with children is refused). The way back,
  `convert_ledger_to_group`, comes later: its refusal for ledger lines can't be reached while a ledger can't take lines
  any other way.
- **Cost center checks run on create.** ERPNext judges a line's cost center only when the GL Entry is saved, on submit.
  Judging it on create keeps every line check in one place and refuses earlier.
- **Too few lines is judged on create.** ERPNext lets a one-line draft be saved and fails it on submit.

## Framework gaps (for core)

- **An optional field can't come back from a read by id.** `Blueprint.optional` on a thing's field stores `NULL`.
  `packages/language-effect/src/modules/handler/internal/read.ts`'s `byId` answers it as `null`, its own answer check
  then rejects `null` and the server dies ("account.get answered outside its declaration"). With that fixed to leave
  the field out, `prove`'s answer-shape eval (`packages/prove/src/modules/evals/internal/calls.ts`) still rejects an
  absent optional field. A root account's `parentAccount` and `accountType`, and a root cost center's
  `parentCostCenter`, hit both. Until they are fixed, `set up a chart of accounts` and `set up cost centers` fail on a
  correct build. The proofs here ran with a local, uncommitted patch to both files (two lines).
- **Lines** worked without a gap: the entry's create takes its lines as a list of structs in its payload and writes
  them as Journal Entry Account rows in its own step (`writes: [JournalEntry, JournalEntryAccount]`).
- **A tree's descendant sum** can't be a `Blueprint.read`: a derive looks at records whose field holds the root's id,
  one level only. So `account.balance` is an operation with no move, whose handler walks the tree with
  `Records.list`. Each list read counts as read at commit, which is right but grows with the chart.
- **The many-row insert on submit** worked: one step inserts a GL Entry per line. Each insert costs its own unique
  checks at commit only where rules exist (none on GL Entry).

## What is left out

Account numbers, currency, freezing, `balance_must_be`, `disabled`, `tax_rate` and the other 27 account types; chart
templates; cost center numbers, allocations and conversions; journal entry voucher types, naming series, parties,
references, cheques, opening entries, inter-company entries, multi-currency, amending and deleting a draft; GL Entry's
party, against, remarks, fiscal year and currency columns; closing a year; accounting periods and freezing dates.

## Time

Nothing reads the world's clock. Every posting day is typed, so no journey moves it, and snag #1001 doesn't apply.
