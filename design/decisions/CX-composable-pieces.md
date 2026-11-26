# CX-composable-pieces: Capxul as pieces a business picks when its app is built (Superseded by CX-features, 26 November 2026: "Capxul as features a business picks when its app is built")

**Drafted 26 November 2026** by Goal 16's 📐 composable-pieces designer (session `session_01S8RF7CccTeLkaVUQpKSExm`),
started by Goal 16's lead, with Aaron in the loop. Grounded at `goal/capxul` `66b3c131`. The architecture calls are the
building agent's (`AGENTS.md`, "Who decides"); section 8 holds the two calls that are Aaron's. Its last section,
"Supersedes", is the ninth. Inputs read: K22, K27,
K42, K43, K44, CX-grill, CX-ledger, CX-payroll-tax, GOAL17-plugin-scope, `docs/canon/{plugins,stores,data}.mdx`,
`packages/compiler/src/modules/mounts`, the superagent's plugins, the gaps #742, #879, #972, #1001, #1044 and #1079, the
parties-and-payments checks (#1116), the developer-experience pages "How Orthograph Works" and "Composition Worked
Example", and ERPNext `a6f54f9c` and Frappe HRMS `46b38904` (outside data, read, never copied).

## Aaron's constraints (26 November 2026)

1. Keep it simple. Composition happens **when an app is built**: pick pieces, compile. Nothing is switched on, swapped or
   mounted inside a running app.
2. Find the natural boundaries, as ERPNext's modules suggest, but cut **by ownership of data and of rules**, not by its
   menu.
3. Say, for each piece, where something is an actor and where it isn't, and why.

## The call in one paragraph

A Capxul piece is an ordinary **feature plugin** (`M1-plugins.md`, `docs/canon/plugins.mdx`): a package in
`examples/capxul/plugins/<piece>/`, tagged `scope:plugin`, mounted by one file, `examples/capxul/blueprint/features/<piece>.ts`.
A business's Capxul is the set of mount files it has; `ortho check` refuses a set with an unmet need; `ortho generate`
makes the app. No new framework word is needed: "piece" in this record is plain English for "a Capxul feature plugin". (Superseded by CX-features, 26 November 2026: "feature", the code's own word for a feature plugin; every "piece" and "pieces" in this record's composability sense reads "feature" and "features".)
The superagent already works this way on `goal/superagent` (five plugins, a dependency order, cross-plugin links by
import, cross-plugin events wired in the app's mount files with `on`), so Capxul follows a proved path. Every piece's
things live in the app's one default database, because the books need a document and its ledger lines in one commit and
reports that read across pieces. So a boundary is a rule about **who may write what**, not a store edge. Pieces connect
in four ways: a link (a field holding another piece's id), an in-commit call (the owner's operation run inside the
caller's commit, for posting to the books), an event (a piece reacting to another's fact, wired by the app), and an
adapter call (Bridge). No Capxul thing is an actor; two narrow places will be (section 3).

## 1. The pieces

28 pieces take all 485 record types in `examples/capxul/doctypes.md`; a 29th comes later with the chain. (Superseded by CX-tax-us-rows, 26 November 2026: "28 pieces take 479 of the 485 record types in `examples/capxul/doctypes.md`, and the other 6, India's income-tax exemption types and their lines, stay listed and are not taken (CX-payroll-tax)".) Fifteen are
**core** (every Capxul has them: the books, HR and payroll Aaron named as the offering, plus Bridge, K43) and thirteen
are **optional** (a business leaves them out and its app has none of their tables, screens, commands or tools).
Counts are record types from the catalogue, with child tables (`line`) in brackets. "Today" names the things already
built in `examples/capxul/blueprint/things/`.

### Core

1. **`company`** (core). Who keeps the books and employs people: the company and its company-wide settings.
   13 (4): Company (with its reporting currency, CX-money-global-payroll), Global Defaults, Authorization Rule and
   Control, Terms and Conditions, Print Heading, Email Digest, SMS Center, Transaction Deletion Record, Portal User.
   Today: `company`. Also owns the asset files (USDC today; USD, GBP, EUR and AED with CX-money-global-payroll) and the shared
   values every piece uses (`Day`, `Amount`, `Name`).
2. **`rates`** (core, agreed with the money and global payroll designer). Exchange rates as dated rows (date, from,
   to, rate, source), entered by hand first; a feed is an adapter mounted on it later. 6 (3): Currency Exchange,
   Currency Exchange Settings (and its two lines), Pegged Currencies (and its line). The ledger reads rates and never
   fetches them. Deferred with every `FX` field while all amounts are USDC (CX-grill, section 3).
3. **`ledger`** (core). The double-entry books: what an account is, what a balanced posting is, which periods are open.
   45 (17): Account, Cost Center (and Allocation), Fiscal Year, Accounting Period, Accounting Dimension (and Filter),
   Finance Book, Journal Entry (and Template, and their account lines), GL Entry, Payment Ledger Entry, Advance Payment
   Ledger Entry, Period Closing Voucher, Account Closing Balance, Accounts Settings, Exchange Rate Revaluation (deferred),
   Process Deferred Accounting, and the repost, ledger-health, ledger-merge, bisect and chart-importer jobs. Today:
   `account`, `cost-center`, `fiscal-year`, `journal-entry`, `journal-entry-account`, `gl-entry`.
4. **`parties`** (core). Who a company trades with, and which receivable or payable account each uses. 15 (7): Customer,
   Supplier, Customer Group, Supplier Group, Party Type, Party Link, Party Account, Territory, Industry Type, Customer
   Credit Limit, Allowed To Transact With, and the group and territory item lines. Today: none (#1116 writes Customer,
   Supplier and their groups).
5. **`tax`** (core). The tax rules a document's lines are taxed by. 12 (6): Sales and Purchase Taxes and Charges
   Templates and their lines, Item Tax Template (and Detail), Item Tax, Tax Category, Tax Rule, Tax Withholding Category
   (and Account, Rate).
6. **`items`** (core). What a company sells or buys, and at what price. 27 (15): Item and its lines, Item Group, Brand,
   UOM, UOM Category and conversions, Price List (and Country), Item Price, Pricing Rule and Promotional Scheme with their
   lines, Product Bundle, Party Specific Item. Capxul takes no stock ledger, so ERPNext's Stock module shrinks to this
   catalogue.
7. **`payments`** (core, agreed with the money and global payroll designer). Moving money and settling what a party is
   owed or owes. 20 (11): Payment Entry (and Reference, Deduction, Advance Tax lines), Payment Request, Payment Order,
   Mode of Payment (and Account), Payment Reconciliation and its jobs, Unreconcile Payment, Payment Gateway Account. It
   sits below `invoicing`: what is still owed is the ledger's Payment Ledger Entry, so a payment settles an outstanding
   by its voucher kind and id and never needs to know what an invoice is. Payroll's and expenses' payables settle here
   too. Every Payment Entry records money that moved, with its mode of payment and a reference (ERPNext's normal
   case): until Bridge and the Safe exist, the company moves it from its own bank or wallet and Capxul records it, so
   a Capxul with no Bridge and no Safe builds. A rail is a piece that moves money first and then records the Payment
   Entry through `payments`' in-commit `record`: `bridge-accounts` for payouts, later the Safe. `payments` never calls
   a rail, so it needs none and no contract is filled twice.
8. **`contractors`** (core, agreed with the money and global payroll designer). Paying people who are not employees,
   the most common case for Capxul's customers (a US company with people abroad). No ERPNext record types: a contractor
   is a `parties` Supplier, and this piece adds its tax form (W-9, W-8BEN, W-8BEN-E: kind, received day, file, expiry),
   its payout method (a wallet, or a rail's external account in a currency), paying many at once (one Payment Entry
   each, through `payments`), and the 1099-NEC year end. The forms are the payer's, so they live here and not in a
   payroll tax piece. Payroll stays employees only.
9. **`invoicing`** (core). Sales and purchase invoices and their terms. 23 (14): Sales Invoice, Purchase Invoice,
   Payment Term and Terms Template, Payment Schedule, Dunning (and Type), Invoice Discounting, Opening Invoice Creation
   Tool, Process Statement Of Accounts, and their lines.
10. **`banking`** (core). A company's bank accounts and what moved through them, matched to the books. 13 (3): Bank,
    Bank Account (and Type, Subtype), Bank Transaction (and Mapping, Payments), Bank Statement Import, Bank Clearance,
    Bank Reconciliation Tool, Bank Guarantee, Cheque Print Template. Today: `bank-account`, `bank-transaction`.
11. **`bridge-accounts`** (core, gated later). Capxul's own Bridge account serving its customers: KYC, KYB, real bank details,
    and deposits and transfers fed to `banking`. No ERPNext record types: Capxul's own, with no translated code, as K43
    requires of a paid service. Today: `bridge-business`, `bridge-individual`. Its own package and folder,
    `examples/capxul/plugins/bridge-accounts/`, beside the adapter `@orthograph/bridge` (`"kind": "adapter"`) in
    `examples/capxul/plugins/bridge/`, which stays where it is: a mount keeps its things' names only when its name is
    the package's own (`packages/compiler/src/modules/mounts/internal/fold.ts:11`), so the two can't share one name.
12. **`people`** (core). Who works for a company and how it is organised. 34 (14): Employee and its history lines,
    Department (and Approver), Designation, Branch, Employee Grade, Employment Type, Employee Group, Holiday List and
    Holiday, onboarding, promotion, transfer and separation (with templates and boarding activities), Exit Interview, Full
    and Final Statement, skills, Identification Document Type, HR Settings. Today: `branch`, `department`,
    `designation`, `employee`, `employee-grade`, `employment-type`, `employee-promotion`, `employee-transfer`,
    `employee-separation`, `holiday-list`, `holiday`.
13. **`time`** (core). When people work and when they are away. 28 (4): Attendance (and Request, Upload, Tool),
    Employee Checkin, Shift Type, Assignment, Request, Location and Schedule, Leave Type, Allocation, Application, Policy
    (and Assignment), Period, Block List, Encashment, Leave Ledger Entry, Leave Control Panel, Compensatory Leave
    Request, Timesheet (and Detail). Today: `attendance`, `attendance-request`, `shift-type`, `leave-type`,
    `leave-allocation`, `leave-application`.
14. **`expenses`** (core). What employees spend for the company and get back. 11 (6): Expense Claim (and Type,
    Account, Advance, Detail, Taxes), Employee Advance, Travel Request (and Itinerary, Costing), Purpose of Travel.
    Today: `expense-claim`, `expense-claim-type`, `expense`.
15. **`payroll`** (core). Paying people: components, structures, pay runs and slips, holding no tax rule
    (CX-payroll-tax). 28 (11): Salary Component (and Account), Salary Structure (and Assignment, bulk), Payroll Period,
    Payroll Entry, Salary Slip and its lines, Additional Salary, Employee Benefit Application and Claim, Employee
    Incentive, Employee Other Income, Retention Bonus, Gratuity (and Rule), Salary Withholding, Payroll Settings,
    Employee Cost Center. Today: `salary-component`, `salary-structure`, `salary-structure-assignment`, `salary-detail`,
    `payroll-period`, `payroll-entry`, `payroll-employee-detail`, `salary-slip`, `salary-slip-detail`.

### Optional

16. **`payroll-tax-us`** (optional, one per jurisdiction; payroll runs with none, and then a slip has no tax lines). United States
    payroll tax as dated rows (CX-payroll-tax). 9 (4): Income Tax Slab (and Other Charges, Taxable Salary Slab),
    Employee Tax Exemption Category, Sub Category, Declaration and Proof Submission, with their lines. (Superseded by
    CX-tax-us-rows, 26 November 2026: "Its published figures are generated dated rows in Income Tax Slab's shape, shipped
    in the piece and not stored (CX-tax-us-rows); a company's SUTA rates and each employee's withholding certificates are
    its things. 3 (2): Income Tax Slab (and Other Charges, Taxable Salary Slab), taken as the rows' shape. India's four
    exemption record types and their two lines stay listed and are not taken (CX-payroll-tax, "What this changes in the
    catalogue").")
17. **`selling`**. Quotes and orders before an invoice. 26 (13): Quotation, Sales Order, Sales Person, Sales Partner,
    Sales Team, targets, Installation Note, Shipping Rule, Coupon Code, Loyalty Program, Incoterm, Selling Settings.
18. **`buying`**. Orders and quotes from suppliers. 19 (10): Purchase Order, Request for Quotation, Supplier Quotation,
    Supplier Scorecard and its parts, Buying Settings.
19. **`pos`**. A till. 19 (12): POS Invoice, Profile, Opening and Closing Entries, Settings, Cashier Closing.
20. **`subscriptions`**. Recurring invoices. 5 (1): Subscription, Plan, Settings, Process Subscription.
21. **`assets`**. What a company owns and how it depreciates. 24 (10): Asset and its capitalisation, depreciation,
    maintenance, movement, repair and value adjustment, Asset Category, Location.
22. **`budgets`**. Limits on spending by account and cost centre, checked as money is spent (slice 12). 4 (2): Budget,
    Monthly Distribution.
23. **`equity`**. Who owns the company. 4 (1): Shareholder, Share Type, Share Transfer, Share Balance.
24. **`projects`**. Work tracked against a project and billed from timesheets. 7 (3): Project, Task, Activity Type,
    Activity Cost, and Sales Invoice Timesheet (the join that bills a timesheet, owned here so `invoicing` never points
    at HR).
25. **`performance`**. Appraisals and goals. 12 (5): Appraisal, Cycle, Template, KRA, Goal, Employee Performance
    Feedback and Criteria. Today: `appraisal`, `appraisal-cycle`, `appraisal-template`, `kra`, `goal`,
    `employee-feedback-criteria`, `employee-performance-feedback`.
26. **`recruitment`**. Hiring. 21 (5): Job Requisition, Staffing Plan, Job Opening, Job Applicant, Interview (Round,
    Type, Feedback), Job Offer, Appointment Letter, Employee Referral. Today: `job-opening`, `job-applicant`,
    `interview`, `interview-round`, `interview-feedback`, `job-offer`.
27. **`workplace`**. The rest of HR, each a leaf: training, grievances, the vehicle log, daily work summaries, health
    insurance. 20 (6).
28. **`crm`**. Frappe CRM's leads, deals and organisations (slice 11). 40 (10). Its won deal becomes a `parties`
    customer.

Later, with the chain (K44): **`onchain-pay`**, each person's and company's Safe and getting paid by a link (slice 2),
on the framework's wallets and chain. It is listed so nothing else takes its records.

**Presets, not pieces.** (Superseded by CX-features, 26 November 2026: "Presets, not features.") People don't pick from 28 names. `ortho new app` (status row `ortho-new`) offers presets that are
lists of mounts: *Books* (`company`, `rates`, `ledger`, `parties`, `tax`, `items`, `payments`, `invoicing`, `banking`,
`bridge-accounts`), *People* (`people`, `time`, `expenses`), *Payroll* (`payroll`, and a tax piece
where one is built), *Capxul core* (all fifteen core pieces), and *Everything*. A preset names the pieces a person
asked for; `ortho new app` adds every piece they need (section 2's needs, transitively) before it writes the mount
files. So *People* also mounts `company`, `rates`, `ledger`, `parties` and `payments` (`expenses` posts to the ledger
and settles through payments), and *Payroll* mounts those five plus `people` and `time`. A set with an unmet need is
refused by `ortho check`. Afterwards a person adds or removes a mount file and
rebuilds.

## 2. Each piece's contract

### The four ways pieces connect

1. **A link.** A field typed by another piece's id (`Employee.fields.id`), by importing the thing from that piece's
   package, as `tickets` imports `Superagent` today. A link only points from a later piece to an earlier one; the order
   is section 4's picture, and no two pieces depend on each other (GOAL17-plugin-scope, call 5). A link is a reference
   only: a piece never writes the thing it links to.
2. **An in-commit call.** The owner's operation runs inside the caller's commit, with the owner's rules, and lands or
   fails with the caller's writes. Posting to the books is the case: ERPNext's own seam is one function,
   `general_ledger.make_gl_entries`, which every module calls in its own transaction, and payroll posts by making and
   submitting a Journal Entry (`payroll_entry.py:557`). In Capxul a voucher's submit calls `ledger.post`; the GL lines
   are the ledger's to write. This is gap 1 (#1079): until it lands, a poster declares `writes: [GLEntry, …]` as payroll
   does today, and the ledger's rules are checked at commit where they can be (G5).
3. **An event.** A piece's fact another piece reacts to, after its own commit: a job offer accepted, a leave approved, a
   deal won. When the reacting piece depends on the emitter, its operation says `on:` itself. When neither needs the
   other, the **app** wires it in a mount file (`m.on(Event, operation, map, { onRefused })`), as
   `examples/superagent/blueprint/features/intake.ts` does, so dropping either piece drops the wiring and nothing else.
   A reaction that can be refused leaves the emitter in a named waiting state with a way out on yes, no and silence (the
   developer-experience thread's "three ways things cross", and its proposed check on waiting states).
4. **An adapter call.** Out of Capxul to Bridge: `Blueprint.step.call(bridge.calls.…)` and Bridge's webhooks in by
   `on:`.

Two **contracts filled at build time** (gap 3) complete them: a piece declares a slot in its own rules that another
piece may fill. `payroll` declares *the tax on a slip*, filled by `payroll-tax-us`; `ledger` declares *a check before a
posting*, filled by `budgets`. A contract is required or optional. A required one with no filler is a `check` error
(none today). An optional one with no filler is empty: no budgets, no budget check; no
tax piece, a slip with no tax lines, which is right for contractors only, employees through an employer of record, or a
country with no income tax. For now a contract takes one filler per app, to keep it simple. Choosing among several by a
row's data, such as each employee's place of work, is a further step that waits on a decision of its own.

### Per piece

Offers are operations (O), events (E), reads (R) and contracts (C). Needs name the piece and how it connects:
link (L), in-commit call (I), event (E), adapter (A).

| Piece | Offers others | Needs |
|---|---|---|
| `company` | R the company and its settings; the `owner.of("company")` role every piece checks; the shared values | none |
| `rates` | R the rate between two assets on a day | `company` L |
| `ledger` | I `post` and `reverse` (balanced lines, ledger accounts only, an open fiscal year and period, one company); R balance, trial balance, profit and loss, balance sheet, a party's balance; C a check before a posting; the open sets *voucher type* and *party type* (gap 2); both amounts on every line, revaluation | `company` L, `rates` R |
| `parties` | R customers, suppliers and their accounts; adds Customer and Supplier to *party type*; E PartyCreated, PartyDisabled | `company` L, `ledger` L (party accounts) |
| `tax` | I `taxesFor(lines)`, a computation run in the caller's commit; R templates | `company` L, `ledger` L (tax accounts) |
| `items` | R items, prices, the price for a party; I `priceFor` | `company`, `ledger`, `tax`, `parties` L |
| `payments` | O pay, receive, request a payment; I `settle` (a payment against an outstanding, by voucher kind and id); I `record` (a payment a rail made); E PaymentSubmitted; adds Payment Entry to *voucher type* | `ledger` I `post`, `parties` L |
| `invoicing` | O raise, submit and cancel invoices; E InvoiceSubmitted, InvoicePaid; R statements; adds its invoices to *voucher type* | `ledger` I `post`, `payments` L, `parties` L, `items` L, `tax` I |
| `banking` | O record a bank transaction, reconcile it; I `record` a bank account (what `bridge-accounts` calls when it opens one); E TransactionLanded, TransactionSettled; R balances by bank account | `ledger` I, `parties` L, `payments` L (a transaction matched to a payment) |
| `bridge-accounts` | O start KYC and KYB, open a bank account (making its `banking` Bank Account); E KybApproved, KycApproved, deposits and transfers; external accounts in a payee's currency and payouts, each recorded through `payments` | `company` L, `banking` I (record an account and a transaction), `payments` I `record`, `@orthograph/bridge` A |
| `people` | R employees, departments, holidays; E EmployeeHired, EmployeeRelieved, EmployeeMoved; adds Employee to *party type* | `company` L |
| `time` | R attendance, leave balances, days worked in a period; E LeaveApproved, AttendanceMarked | `people` L |
| `expenses` | O claim, approve, pay; E ClaimApproved, ClaimPaid | `people` L, `ledger` I `post`, `payments` L (its payable settles there; reacts to PaymentSubmitted) |
| `payroll` | O assign structures, run payroll, submit slips; E PayRunSubmitted; C the tax on a slip; adds its vouchers to *voucher type* | `people` L, `time` R (days, leave without pay), `ledger` I `post` (the accrual: payroll payable, party = the worker), `payments` L (the payables settle there), a tax piece C |
| `contractors` | O record a tax form, set a payout method, pay many contractors; R a contractor's calendar-year total and the 1099-NEC figures | `parties` L (a contractor is a Supplier), `payments` I (one Payment Entry each), `bridge-accounts` I (a payout to an external account, from slice 10; until then contractors are paid outside Capxul and recorded through `payments`, CX-money-global-payroll decision 6) |
| `payroll-tax-us` | fills payroll's tax contract from dated rows | `payroll` L, C |
| `selling` | O quote, order, make the invoice | `invoicing` I (make an invoice), `items`, `parties`, `tax` L |
| `buying` | O request, quote, order, make the purchase invoice | the same as `selling` |
| `pos` | O open, sell, close a till | `invoicing` I, `items`, `parties` L |
| `subscriptions` | O subscribe, invoice each period (on a timer) | `invoicing` I, `items`, `parties` L |
| `assets` | O capitalise, depreciate, dispose | `ledger` I, `items` L, `invoicing` L |
| `budgets` | fills the ledger's check before a posting | `ledger` L, C |
| `equity` | O issue and transfer shares; adds Shareholder to *party type* | `ledger` I, `parties` L |
| `projects` | O bill a timesheet onto an invoice | `time` L, `invoicing` I, `ledger` L (a project is a dimension value, not a new column) |
| `performance` | O appraise, set goals | `people` L |
| `recruitment` | E OfferAccepted | `people` L; the app wires OfferAccepted to `people`'s hire |
| `workplace` | its leaves | `people` L |
| `crm` | E DealWon | `parties` L; the app wires DealWon to `parties`' create customer |

**Payroll, payments and the ledger** (agreed with the money and global payroll designer, CX-money-global-payroll).
Payroll calculates gross to net and posts its accrual through `ledger.post` in its own commit (payroll payable, party
the worker); it never writes ledger lines and never moves money. A payable is the ledger's outstanding against a party,
not a record of its own. A rail moves money; `payments` records it and settles outstandings. The rails are
`bridge-accounts` and later the Safe; without one the company moves the money and Capxul records it. The ledger owns the lines, both amounts on each and revaluation; `rates` owns the rates.

**Rules every contract keeps.** A piece writes only its own things, except through an in-commit call its owner offers
(gap 4 makes `check` say so). A core piece never links to an optional one: when a core record must know about an
optional piece's record, the optional piece owns the join (Sales Invoice Timesheet in `projects`). A value set that
later pieces extend (voucher type, party type) is open, not a list the earlier piece keeps.

## 3. Actors

An actor (the `actor` store kind, one Durable Object per instance, `packages/host-cloudflare/src/modules/actors`) is a
single writer for one key. It suits one hot instance that many calls change at once and nobody lists. It can't be
listed, can't hold a rule across rows, and can't commit with another store (`docs/canon/stores.mdx`).

**No Capxul record is an actor, now or at the move.** Every piece's records live in the database, for three reasons the
books can't give up:

- A voucher and its ledger lines commit together (section 2, way 2). An actor commits alone, so a posting would become a
  workflow with a waiting state, and the books could show a submitted invoice with no lines.
- Reports, balances, statements and every list read across many rows: a trial balance sums GL lines, a budget check sums
  what was spent. An actor has no list.
- The rules are across rows: one fiscal year per day, a unique account name in a company, debits equal credits across a
  voucher's lines (G5 rules live on tables).

**Rejected: each company's ledger as an actor.** It would give each company its own single writer and spread the load,
but it breaks all three reasons above. If one database ever becomes the limit, the answer is a database per company (a
store binding), not an actor.

**Not an actor: Bridge's inbound stream.** The framework's webhook door (K40, `packages/host-cloudflare/src/modules/inbound`
on `goal/superagent`) keeps its dedupe in `_journal` and its catch-up cursor in `_cursors`, in the database, with no
Durable Object, and Capxul adds nothing to it.

**Where actors will be:**

| Where | Why an actor | When |
|---|---|---|
| A company's numbering series (`SINV-2026-00001`), one per company and series | Gapless numbers need one writer, the counter is hot on every submit, and nobody lists a counter. The voucher keeps its id and takes the number from the actor | When human document numbers are asked for; not scheduled |
| The chain relayer, one per signer | One nonce sequence per signer (M6.07) | Slice 2, with the chain |

The developer-experience thread's worked example makes its Budget an actor, with its spends inside. Capxul's budgets
stay in the database, because ERPNext's budget is checked against the sum of posted GL lines, which an actor can't read.
The example's shape is right where the limit is the only truth; Capxul's limit is a report over the books.

## 4. The dependency picture

An arrow points from a piece to the piece it needs. Core pieces are solid, optional ones dashed.

```mermaid
flowchart BT
  company[company]
  rates[rates] --> company
  ledger[ledger] --> rates
  parties[parties] --> ledger
  tax[tax] --> ledger
  items[items] --> tax
  items --> parties
  payments[payments] --> parties
  invoicing[invoicing] --> items
  invoicing --> payments
  banking[banking] --> payments
  bridgeacc[bridge-accounts] --> banking
  bridgeacc --> payments
  people[people] --> company
  time[time] --> people
  expenses[expenses] --> payments
  contractors[contractors] --> payments
  contractors --> bridgeacc
  expenses --> people
  payroll[payroll] --> time
  payroll --> ledger
  taxus([payroll-tax-us]) --> payroll
  selling([selling]) --> invoicing
  buying([buying]) --> invoicing
  pos([pos]) --> invoicing
  subscriptions([subscriptions]) --> invoicing
  assets([assets]) --> invoicing
  budgets([budgets]) --> ledger
  equity([equity]) --> parties
  projects([projects]) --> invoicing
  projects --> time
  performance([performance]) --> people
  recruitment([recruitment]) --> people
  workplace([workplace]) --> people
  crm([crm]) --> parties
  classDef opt stroke-dasharray: 5 5
  class taxus,selling,buying,pos,subscriptions,assets,budgets,equity,projects,performance,recruitment,workplace,crm opt
```

One root, `company`; under it `rates` and `ledger` on the books side, and `people` on the HR side. The books and HR meet in two places only: `expenses` and
`payroll` post to the ledger, and their payables settle through `payments`. Neither needs `invoicing`. That matches ERPNext, where HR has 5
inbound links and Payroll 4, against Setup's 603 (the research behind this record).

A page to look at: https://claude.ai/artifact/FPWu4Xyw5bEMZ5htkU7HTD (section 4's picture, the pieces, and how they connect).

## 5. Framework gaps

Ranked by what they block. Gaps 1 and 6 were filed already (#1079, #882); 2, 3, 4, 5 and 7 are new and filed as #1132, #1133, #1134, #1135
and #1136 (Gap issues, milestone Goal 16, `lane:goal-16`).

1. **One operation runs another's inside its commit** (#1079, with #972's second move). *Blocks* the books' contract:
   without it every poster writes the ledger's things itself and the ledger's rules are duplicated in payroll, expenses,
   invoicing and banking. Draft: "A step may run an operation of a piece it depends on, in the same store, inside the
   caller's commit: the callee's `allowed` is the system, its rules and refusals apply, its writes join the commit, and
   its refusal refuses the caller. Checks: payroll's submit posts through `ledger.post` and lands its slips and GL lines
   together; a posting to a closed period refuses the submit and writes nothing; a call into another store is a compile
   error naming both." Before invoices (slice 7b).
2. **Open sets** (#1132). A reference to one of several kinds exists (`Blueprint.refAny()`,
   `packages/orthograph/src/modules/values/service.ts:85`); what is missing is the open set of kinds. It has an interim, so
   the Books lane doesn't wait on it. It is needed to split `ledger` cleanly from the pieces that post:
   `values/ledger.ts:31` lists `VoucherType` as `["Journal Entry"]`, #1116 adds Payment Entry, and each new voucher
   would make the ledger name a later piece. The same holds for party type (Customer, Supplier, Employee, Shareholder).
   Draft: "A value declared open (`Blueprint.oneOf.open`) that a piece depending on its owner adds members to; the
   compiled model holds the union of the mounted pieces' members. A reference (`voucher`, `party`) holds a kind from that
   set and an id. Checks: a member added by an unmounted piece is absent from the API, CLI and MCP; a reference to a kind
   not in the set is refused." Interim: the ledger keeps a closed list as plain names, no import.
3. **Contracts one piece declares and another fills at build time** (#1133). *Blocks* `payroll-tax-us` as its own piece and
   `budgets`' stop (slice 12). M1.08's needs name a plugin, not a contract several plugins can meet. Draft: "A feature
   declares a contract (an input and output schema, run in the caller's commit); another feature fills it; `check`
   refuses a required contract with no filler or two, and an optional one with none is skipped. Checks: a required contract with no filler, or with two, is refused; payroll with no
   tax piece compiles and its slips have no tax lines; with `payroll-tax-us` a United States employee's slip carries its
   tax lines; with no budgets a posting is not checked." Interim: no tax piece fills payroll's contract, so slips have
   no tax lines. `payroll-tax-us` is mounted from its first slice, filling nothing, so its own journeys run in
   `examples/capxul` (Aaron, 26 November 2026: the lane is not parked).
4. **`check` enforces that a piece writes only its own things** (#1134). *Doesn't block*; makes section 2's rule real. Draft:
   "A step's `writes` may name only things of its own plugin or the app's; another plugin's thing is a compile error
   naming the owner's in-commit operation to call." After gap 1.
5. **A deployed app adds or drops a piece by rebuilding, with a forward migration** (#1135). This replaces "mount into a running
   app" (K43, section 2). Today the model renders one `0001_things.sql`, regenerated; `design/later.md:215` already parks
   the same need for a door added to a deployed app, and D2 leaves migrations of a live app to stage three. *Doesn't block* until a Capxul is
   deployed with data and then adds a piece (the CRM, slice 11). Draft: "Migrations are a sequence: `generate` diffs the
   locked model against the last applied one and writes the next file, additive by default; dropping a piece's tables
   needs an explicit `ortho migrate --drop <mount>`. Checks: a world with data gains a new piece's tables and keeps its
   rows; dropping a piece without the flag is refused."
6. **Money in a field's asset** (#882, unparked by CX-money-global-payroll, which owns it): `money.of` a field naming
   an asset, and a conversion with rounding in the values module. *Blocks* several currencies; not the pieces.
7. **Two compositions proved in CI** (#1136). *Doesn't block*; proves optional pieces are optional. Draft: "Slice 13's job also
   builds a Capxul with only the *Books* preset and runs the journeys whose pieces it mounts; a journey that needs an
   unmounted piece is skipped by name." Needs the journeys tagged by piece; journeys stay in `examples/capxul/journeys/`
   (the superagent keeps its own in `e2e/superagent/`).

Not gaps, already there: features with things and stores fold into the model (`packages/compiler/src/modules/mounts`),
a mount named as its plugin keeps its things' names (so tables, wire and commands don't change when a thing moves into
a piece), cross-plugin imports, `owner.of(...)` roles across things, and the `on` verb in a mount
(`packages/orthograph/src/modules/plugins/service.ts:51`). Also not a gap but a step of the move:
`pnpm-workspace.yaml` lists `examples/superagent/plugins/*` and not yet `examples/capxul/plugins/*`.

## 6. Moving today's 53 things

The brief counted 44; there are 53 thing folders today, and #1116 lands five more as it is, in `blueprint/things/`
(CX-money-global-payroll says the same). Each goes to the piece section 1 names:

| Piece | Things today |
|---|---|
| `company` | company |
| `ledger` | account, cost-center, fiscal-year, journal-entry, journal-entry-account, gl-entry |
| `banking` | bank-account, bank-transaction |
| `bridge-accounts` | bridge-business, bridge-individual |
| `people` | branch, department, designation, employee, employee-grade, employment-type, employee-promotion, employee-transfer, employee-separation, holiday-list, holiday |
| `time` | attendance, attendance-request, shift-type, leave-type, leave-allocation, leave-application |
| `expenses` | expense-claim, expense-claim-type, expense |
| `performance` | appraisal, appraisal-cycle, appraisal-template, kra, goal, employee-feedback-criteria, employee-performance-feedback |
| `recruitment` | job-opening, job-applicant, interview, interview-round, interview-feedback, job-offer |
| `payroll` | salary-component, salary-structure, salary-structure-assignment, salary-detail, payroll-period, payroll-entry, payroll-employee-detail, salary-slip, salary-slip-detail |
| `parties` (from #1116) | customer, customer-group, supplier, supplier-group |
| `payments` (from #1116) | payment-entry |

**Value files.** `blueprint/values/*.ts` split with them:

- To `company`, the values every piece uses: `values/company.ts`, `Day` (today in `values/employee.ts`), `Amount` (in
  `values/expenses.ts`) and `TimeOfDay` (in `values/shift-type.ts`, also used by `interview`; moving it to `company`
  avoids a `recruitment` to `time` edge).
- `values/bridge.ts` splits in two: what a bank account and a transaction hold (`AccountCurrency`, `DepositDetail`,
  `BridgeRef`, `Dollars`, `Party`, `TransferFailure`) goes to `banking`, renamed for any bank in the same pair;
  what only KYC and KYB use (`BridgeLink`, `LegalName`, `RejectionReason`) goes to `bridge-accounts`.
- One piece each: `ledger.ts` to `ledger`; the rest of `employee.ts` and `holidays.ts` to `people`; `attendance.ts`,
  `leave.ts` and the rest of `shift-type.ts` to `time`; the rest of `expenses.ts` to `expenses`; `payroll.ts` to
  `payroll`; `recruitment.ts` to `recruitment`; `appraisals.ts`, `appraisal-lines.ts`, `appraisal-ids.ts` and
  `appraisees.ts` to `performance`.
- `branches-names.ts`, `grades-names.ts` and `leave-journeys.ts` are used only by journeys and stay in the app.

**Starting worlds.** The 105 files in `blueprint/starting-worlds/` (with #1116's 15) stay in the app: a world spans
pieces, as a journey does. Their import paths change in each pair's check half, beside the journeys'.

**What keeps every journey green.** A plugin may import only plugins, never the app, so the move goes from the roots
out. A thing moved into a piece mounted under its own name keeps its name, so its table, its wire, its commands and
its trace don't change, and no journey's assertions change. What changes in a journey is its import paths
(`../blueprint/things/company/roles.ts` is imported by 74 journey files), and a builder never edits a journey. So each
move lands as a pair under G12: `goal-16/pieces-<piece>-check` (Superseded by CX-features, 26 November 2026: "`goal-16/features-<feature>-check`"), where an author changes only import paths and proves
the journeys unchanged otherwise, and `goal-16/pieces-<piece>-build` (Superseded by CX-features, 26 November 2026: "`goal-16/features-<feature>-build`"), which moves the things, handlers and values,
writes the mount file, and ends with `prove` passing everything that passed before.

1. **`company`** first, alone: everything links to it. This move also adds `examples/capxul/plugins/*` to the workspace
   and proves the mechanics (names kept, the generated wire byte-identical).
2. **`ledger`** and **`people`**, in parallel.
3. **`time`**, **`performance`** and **`recruitment`** (after `people`), in parallel, each keeping today's names and
   wire.
4. **The bank-account flip, inside the app,** its own G12 pair, because it changes the wire, done before either thing
   moves so the dependency points the final way from the start. Today `bank-account.open` takes
   `business: BridgeBusiness.fields.id`, refuses `KybNotApproved`, is allowed by `owner.of("business.company")` and its
   handler reads the Bridge business. All of that is Bridge's, so `open` becomes a `bridge-accounts` operation on
   `bridge-business` (open a bank account for an approved KYB), which calls Bridge and makes the Bank Account through
   `banking`'s in-commit `record` (until gap 1, by `writes: [BankAccount]`). `BankAccount` loses its `business` field
   and keeps company, name, currency and bank details; `bridge-accounts` keeps which Bridge account backs it. Then
   `banking` needs no Bridge, and `bridge-accounts` needs `banking`.
5. **`banking`** (after `ledger` and the flip), then **`bridge-accounts`** (after `banking`).
6. **`expenses`** (after `people` and `ledger`; `payments` doesn't exist yet, so the payment link waits for it).
7. **`payroll`** last of today's, after `time` and `ledger`. Its submit keeps `writes: [JournalEntry,
   JournalEntryAccount, GLEntry]` across the boundary until gap 1 lands, then calls `ledger.post`.

8. **#1116's five things:** four to `parties` and `payment-entry` to `payments`, after `ledger`.

Pieces with nothing built yet (`rates`, `contractors`, `tax`, `items`, `invoicing` and the optional ones) are born as
plugins.

## 7. What it changes in the plan

**Lanes.** A lane owns one or more piece folders, so two lanes never touch the same paths (K42's collision rule works on
paths). Today every slice edits `examples/capxul/blueprint/` and the shared value files; after the move, a slice edits
its piece's folder and, at most, one mount file.

| Lane | Pieces | Starts after |
|---|---|---|
| Books core | `ledger` and `rates`, then `parties`, `payments`, `contractors`, `tax`, `items`, `invoicing` | the move's step 2; gaps 1 and 2 |
| Banking | `banking`, `bridge-accounts` | `ledger` moved and the bank-account flip |
| HR | `people`, `time`, `expenses` | the move's step 2 |
| Payroll | `payroll` | `time` moved |
| United States payroll tax | `payroll-tax-us`, a lane of its own (Aaron, 26 November 2026; brief `design/goals/16-lane-payroll-tax.md`) | its rates rows, its W-4 and its calculator are built now in its own folder; it is mounted from its first slice, filling nothing; its link to `payroll` and filling payroll's contract wait for move 7 (`payroll` moved) and gap 3 |
| Optional books | `selling`, `buying`, `pos`, `subscriptions`, `assets`, `equity`, `projects`, `budgets` | `invoicing` built |
| Optional HR | `performance`, `recruitment`, `workplace` | `people` moved |
| CRM | `crm` | `parties` built |

**What that buys.** Today Goal 16 runs one slice at a time, because each touches the shared blueprint. After the move,
up to five lanes can run at once (books core, banking, HR, payroll, optional HR), and seven once invoicing exists. Each
lane's journeys and checks are about its own pieces, so authors and builders don't wait on each other across lanes. The
critical path (K44) is unchanged in order: books, HR, payroll, money in and out, budgets, Bridge.

**Slice changes.** Slice 11 (the CRM) needs no runtime mounting: it is an optional piece a business picks when its
Capxul is built, and adding it to a deployed Capxul is a rebuild with gap 5's forward migration. The status row
`adopt-mounted-thing` goes back to what K22 decided it for, an app calling a mounted thing by its own word, and the
`crm` row no longer needs it. A new slice, "Capxul as pieces" (Superseded by CX-features, 26 November 2026: "Capxul as features") (the move, section 6), goes before slice 7b's invoices.

## 8. Decisions for Aaron

**Answered by Aaron on 26 November 2026, by voice, relayed by Goal 16's lead** (CX-money-global-payroll records
his answers too, under "Aaron's answers, 26 November 2026"): "I'm giving yes to anything that you just said so far. I
haven't really looked at everything yet". So both decisions below are yes, as recommended.

On the tax lane he said: "I don't want to park the tax lane. I want to do that in a separate, what I want to do is I
want to like scope it out. And then what we're going to do is we're going to fire it off in AMP. So it's going to be a
separate thing and just like stay up to date with what we're doing." So contractors come first on the main path, and `payroll-tax-us` is built alongside as its own piece. It plugs into payroll's *tax on a
slip* contract when gap 3 lands; until then it is mounted but fills nothing, and slips have no tax lines.

1. **Yes (Aaron, 26 November 2026).** **Is a business allowed to leave out selling, buying, the till, subscriptions, assets, equity, projects and the rest
   of section 1's optional list?** I recommend yes: the core is the books, HR, payroll and Bridge, and the rest are
   optional pieces offered through presets. The other choice is one fixed Capxul with everything, which is simpler to
   test but makes every company carry tables and screens it never uses.
2. **Yes (Aaron, 26 November 2026).** **Adding a piece to a running Capxul means rebuilding and redeploying it, with its data kept.** I recommend yes, as
   you asked: no switch inside the running app. For the hosted Capxul that is a redeploy we run for the customer; for a
   self-hoster it is `ortho add`, then deploy. The other choice is a switch in the running app, which needs every
   piece's code shipped to every company and turned on or off at run time: the hot-swapping you ruled out.

Inputs, not decided here: the money and global payroll design (CX-money-global-payroll, on
`goal-16/money-global-payroll-design`) and #1116. The money designer proposed the `rates` and `payments` pieces and the
payroll, payments and ledger boundary in section 2; this record takes them. Whether a currency differs from an asset,
how a company's currency is chosen and who Capxul's customers pay are that record's. #1116 fits as written: its
Customer, Supplier and groups go to `parties`, Payment Entry to `payments`, and its fixed party types become gap 2's open
set when Employee and Shareholder join. Each new country's payroll tax is another `payroll-tax-<country>` piece. An
employer of record is no piece at first: it is a supplier and its invoice a bill paid through `payments`; later, an
optional `eor` piece with its adapter may fill a payroll contract, *who calculates this worker*. The order the two
records agree: the currency slice comes after the `company` and `ledger` pieces have moved
(this record's moves 1 and 2), works inside `company`, `rates`, `ledger` and `payments`, and comes before slice 7b's
invoices; the rest of the move runs
in parallel with currency, which needs none of it. `contractors` comes once `payments` exists, on the main path;
`payroll-tax-us` is built alongside in its own lane.

**Agreement with the developer-experience thread** (session `session_01S8RF7Ab2eChDNZHaQJ44eV`, draft #1100). It
replied on 26 November 2026 that it designed nothing for composing an app from pieces, and that none of its pages
assumes mounting or switching anything on in a running app: everything it shows is fixed at build time. Its
"composition" is how operations inside one blueprint cross two stores, and how a screen falls out of a thing. So nothing
here conflicts with it. This record uses its crossings (one commit in one store, an event with a waiting state, an
outside call) and adds one for the books, an in-commit call into another piece's operation in the same store; its own
proposals (a reference to a thing, `Blueprint.next`, owners together, a rule as data) are unconfirmed by Aaron and
nothing here builds on them. The one difference is its example's Budget as an actor (section 3). Its finding for
`onchain-pay`: a rule that lives on chain changes by a migration with money in it, which the blueprint has no word for
yet, so that piece inherits the problem when it comes.

## Supersedes

- `design/decisions/K43-capxul-core.md`: "each a plugin a running Capxul mounts when someone switches it on" → "each an optional piece a business picks when its Capxul is built (CX-composable-pieces)"
- `design/decisions/K43-capxul-core.md`: "Orthograph hasn't proved it can mount a plugin into an app that already holds data. Capxul pulls that" → "Adding a piece to a deployed Capxul is a rebuild with a forward migration (CX-composable-pieces, gap 5)"
- `design/decisions/CX-payroll-tax.md`: "mounting a module into a Capxul that already holds data waits on slice 11" → "adding a module to a deployed Capxul is a rebuild with a forward migration (CX-composable-pieces, gap 5)"
- `design/goals/16-capxul.md`: "11 · The CRM, a module switched on later, off the path (after 9)" → "11 · The CRM, an optional piece picked when a Capxul is built, off the path (after 9)"
- `design/goals/16-capxul.md`: "as a module a running Capxul mounts; off the critical path (K44). Pulls mounting a plugin into an app that already holds data (K43, section 2)" → "as an optional piece a business picks when its Capxul is built; off the critical path (K44). Adding it to a deployed Capxul is a rebuild with a forward migration (CX-composable-pieces)"
- `design/goals/16-capxul.md`: "a module someone switches on later" → "an optional piece a business picks when its Capxul is built"
- `docs/canon/status.md`: "so a running app can switch a plugin on after the fact (Capxul's modules, K43)" → "an app gives a mounted thing its own name (K22)"
- `design/decisions/CX-payroll-tax.md`: "A payslip's tax lines come from the jurisdiction module for the employee's place of work" → "one tax piece per app for now; choosing one per employee waits on a decision of its own (CX-composable-pieces)"
- `docs/canon/status.md`: "CRM: Frappe CRM's 40 doctypes, a module switched on later" → "CRM: Frappe CRM's 40 doctypes, an optional piece picked when a Capxul is built"
- `examples/capxul/doctypes.md`: "Frappe CRM, the module switched on later. Slice 11." → "Frappe CRM, an optional piece picked when a Capxul is built (CX-composable-pieces). Slice 11."
- `examples/capxul/doctypes.md`: "a stock module can be switched on later" → "a stock piece can be added later"
