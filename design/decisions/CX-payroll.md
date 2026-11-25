# CX-payroll: salary components, structures, assignments, payroll periods, payroll entries and salary slips

**Decided 25 November 2026** by slice 9a's checks author (thread T-01a211fd-ba4e-768b-b910-36d34fe65e07), under Goal
16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), who set the scope. The source is Frappe HRMS at `46b38904`
(`hrms/payroll/doctype/{salary_component,salary_structure,salary_detail,salary_structure_assignment,payroll_period,
salary_slip,payroll_entry,payroll_employee_detail}`, read with every `validate`, `before_submit`, `on_submit` and the
functions they call). Where the scope and the source differed, the source won, and each difference is listed below
which core confirmed.

## What 9a holds

The company's owner runs everything. An employee reads only their own salary slips and their lines. Every amount is
USDC in base units (`Amount`, and `Balance` where a draft may go below nothing); no field holds a currency or a rate
(CX-grill, section 3). Every day is typed: nothing reads the world's clock, so snag #1001 doesn't apply.

- **Salary Component** (`active`): company, `salaryComponent` (its name, unique in the company), `type` (Earning or
  Deduction), `amount` (the default a structure line takes when it names none; 0 for none) and `account` (the ledger
  its pay is booked to).
- **Salary Structure** (`draft → submitted → cancelled`): company, `salaryStructureName` (unique in the company),
  `totalEarning`, `totalDeduction`, `netPay`.
- **Salary Detail**: one line of a structure: `type`, `line` (from 1 within its table), component, amount. Only the
  structure's create writes them.
- **Salary Structure Assignment** (`draft → submitted → cancelled`): company, employee, structure, `fromDate`.
- **Payroll Period** (`active`): company, `payrollPeriodName` (unique in the company), `startDate`, `endDate`.
- **Payroll Entry** (`draft → submitted → accrued`): company, `postingDate`, `startDate`, `endDate`, `costCenter`,
  `payrollPayableAccount`, `numberOfEmployees`.
- **Payroll Employee Detail**: one employee an entry pays. Only the entry's create writes them.
- **Salary Slip**: company, employee, payroll entry, structure, `postingDate`, `startDate`, `endDate`, `grossPay`,
  `totalDeduction`, `netPay`, `status` (Draft or Submitted) and, once booked, `journalEntry`. No machine and no
  operation of its own: only its entry's `submit` and `submit-slips` write it (`writes`, CX-takeover).
- **Salary Slip Detail**: one line of a slip, copied from its structure's line. HRMS keeps a structure's lines and a
  slip's in one doctype (Salary Detail); here they are two things, so each has one parent and its own reads.
- **Reads:** each thing by id; a structure's lines; an employee's assignments; a company's payroll entries; an entry's
  employees; an employee's slips, narrowed by entry; a slip's lines. The accrual is read back through 7a's
  `journal-entry.get`, `journal-entry-account.list`, `gl-entry.list` and `account.balance`.

## The rules

| Rule | Whose | Where |
|---|---|---|
| A component's account is the company's (`ComponentAccountNotInCompany`), then a ledger (`ComponentAccountIsGroup`); then its name is free in the company (`SalaryComponentTaken`) | HRMS keeps the account per company in Salary Component Account and the accrual's `validate_account_head` refuses another company's or a group; Capxul judges it on create | `salary-component.create` |
| A structure has an earning (`StructureWithoutEarnings`); then, line by line, earnings then deductions: the component is the company's (`StructureComponentNotInCompany`, which also takes a well-formed id that names no component, as 7a's journal lines do; an id of another kind is refused by the payload's schema before the call is sent, and no journey names a missing id, as that would write it as a string) and of the table's type (`StructureComponentWrongType`); then over every line, it pays something, its own amount or its component's (`StructureLineWithoutAmount`); then no component is on two lines (`StructureComponentRepeated`); then the name is free (`SalaryStructureNameTaken`). Each line refusal names the first component that breaks it: for a repeat, the component on the first line that repeats an earlier one | Capxul's own (below); filling a 0 line from its component is HRMS's `set_missing_values` | `salary-structure.create` |
| A structure's totals are its lines' sums, and its net pay their difference; a draft may go below nothing | HRMS's form works them out | `salary-structure.create` |
| A structure with more deductions than earnings can't be submitted (`StructureNetPayNegative`, carrying the net pay) | HRMS refuses a slip with net pay below 0 on submit; with no formulas a slip pays its structure as it is, so Capxul refuses the structure | `salary-structure.submit` |
| A structure a submitted assignment or any slip uses can't be cancelled (`StructureInUse`) | Frappe's `check_no_back_links_exist`; Capxul counts a draft slip too | `salary-structure.cancel` |
| An assignment's employee is the company's (`AssignedEmployeeNotInCompany`) and still at work (`AssignedEmployeeHasLeft`); no submitted assignment of theirs starts that day (`AssignmentExists`, carrying the day); it doesn't start before they joined (`AssignmentBeforeJoining`, carrying the joining day); the structure is the company's (`AssignedStructureNotInCompany`) and submitted (`AssignedStructureNotSubmitted`) | the day, joining and company checks are HRMS's `validate_dates` and `validate_company`; the leaver rule is CX-expense-leavers; the submitted structure is the HRMS form's filter, here refused | `salary-structure-assignment.create` |
| Submit judges `AssignmentExists`, then `AssignedStructureNotSubmitted`, again: drafts and cancelled assignments hold no day | HRMS runs `validate` again on submit | `salary-structure-assignment.submit` |
| A period doesn't end before it starts (`PayrollPeriodEndsBeforeStart`); a one-day period is allowed. It shares no day, both ends counted, with another of the company's periods (`PayrollPeriodOverlaps`, naming the earliest-starting); then the name is free (`PayrollPeriodNameTaken`) | HRMS's `validate_from_to_dates` and `validate_overlap`; HRMS names whichever overlapping period its query returns first (no order), so naming the earliest-starting is Capxul's own | `payroll-period.create` |
| An entry's days run forward (`PayrollEndsBeforeStart`); its payable account is the company's (`PayableAccountNotInCompany`), a ledger (`PayableAccountIsGroup`) and has no account type (`PayableAccountHasType`); its cost center is the company's (`PayrollCostCenterNotInCompany`) and a ledger (`PayrollCostCenterIsGroup`) | the days are the slip's `validate_from_to_dates`; the account type is HRMS's `validate_payroll_payable_account`; the rest are the accrual entry's and GL Entry's checks, judged early. The order is Capxul's own | `payroll-entry.create` |
| An entry holds each employee of the company still at work, joined by the last day, with a submitted assignment starting by the last day, and no submitted slip for these very days; in the order they were hired. None is `NoEmployeesFound` | HRMS's `get_filtered_employees` and `remove_payrolled_employees`; the order is Capxul's own | `payroll-entry.create` |
| Submit refuses a slip of one of its employees, draft or submitted, from another entry, for these very days (`SalarySlipExists`), over every employee first; then an employee whose structure (that of the latest submitted assignment starting by the last day) has no submitted assignment starting by the first day, or by the joining day for one who joined inside the span (`NoAssignmentAtStart`) | HRMS's `validate_existing_salary_slips`, then the slip's `set_salary_structure_assignment` | `payroll-entry.submit` |
| Submit makes a draft slip per employee, copying its structure's lines, earnings then deductions; gross pay, total deduction and net pay are their sums. A leaver since the draft is still paid | HRMS's `create_salary_slips`; leavers are CX-expense-leavers | `payroll-entry.submit` |
| Submit-slips refuses a posting day in none of the company's fiscal years (`AccrualOutsideFiscalYear`), writing nothing | the accrual journal entry's `get_fiscal_year` on submit | `payroll-entry.submit-slips` |
| Submit-slips submits every slip and posts one submitted Journal Entry, with its lines and one GL Entry per line: a debit per earning account (every slip's earning lines on components booked there, summed), a credit per deduction account, and a credit of the slips' net pay to the payable account (an account both earnings and deductions are booked to gets a debit line and a credit line, never netted, as HRMS keeps the two totals apart; the debits, then the credits, come in the order their accounts are first met, slip by slip in the entry's order and line by line, as HRMS reads slip detail rows), all in the entry's cost center and on its posting day, remark "Accrual Journal Entry for salaries from <first> to <last>". A line of 0 is left out. Each slip names the journal entry | HRMS's `make_accrual_jv_entry` with employee-wise accounting off (its default) | `payroll-entry.submit-slips` |

## Where the source changed the scope

Goal 16's core confirmed all nine on 25 November 2026 (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa). Items 3 and 4
are known limits that 9c revisits.

1. **A payroll entry takes three moves, not one.** The scope's entry "fills in the active employees, creates their
   salary slips and submits them". HRMS does that in three steps the owner takes: the entry's `fill_employee_details`,
   its submit (`on_submit` makes draft slips) and its "Submit Salary Slip" (`submit_salary_slips`, which submits them
   and books the accrual). Capxul keeps HRMS's steps as `create`, `submit` and `submit-slips`, so a draft slip can be
   checked before it is booked, and its machine is `draft → submitted → accrued`.
2. **The entry's days are typed, not the payroll period's.** HRMS's Payroll Entry doesn't name a Payroll Period: its
   days come from the pay frequency and the fiscal year (`get_start_end_dates`), and only tax reads the period. Here
   the owner types the first and last day, and the payroll period stands on its own until tax (9b) reads it.
3. **Leavers.** HRMS fills in an employee who left on or after the first day (`relieving_date >= start_date`) and
   prorates their pay by payment days. Capxul doesn't store the relieving day (#742, item 5) and has no payment days
   (9c), so a leaver is skipped when the entry is made (CX-expense-leavers), and one who leaves after the draft is
   still paid in full on submit, as HRMS does for an employee already on the entry. A known limit 9c revisits.
4. **Every line pays in full.** HRMS prorates a line by payment days (`depends_on_payment_days`, on by default), so a
   joiner inside the span is paid for their days. Payment days need payroll settings (9c): here a joiner on 8 April is
   paid April in full. `run a payroll` pins this. A known limit 9c revisits.
5. **No formulas.** A structure line pays a fixed amount, its own or its component's. HRMS's condition, formula,
   `amount_based_on_formula`, `base` and `variable` are left out. So every structure rule is Capxul's own: HRMS's
   `validate` judges only formulas, flexible benefits, timesheets, payment days and tax. They are the rules a fixed
   structure needs: an earning, the company's own components of the right type, no line paying nothing (HRMS's slip
   drops a zero line), no component twice (HRMS's slip keeps one row per component, so the earlier line would never be
   paid), and no net pay below nothing on submit.
6. **Components and structures are the company's.** HRMS keeps components and structures for the site and a
   component's account per company. Capxul's companies are separate organisations (K42, call 10): each keeps its own,
   names unique per company, and a component has one account.
7. **Cancelling a structure counts a draft slip** as in use, where Frappe's back-link check counts only submitted
   documents, as its payroll entry submits that slip later.
8. **The salary slip has no machine.** Only its payroll entry makes and submits it, so its state is HRMS's `status`
   field, as GL Entry's `isCancelled` is in 7a. Cancelling an entry, which cancels and deletes its slips and cancels
   its journal entry, comes later.
9. **The accrual has one cost center:** the entry's. HRMS splits each employee's pay over the assignment's payroll cost
   centers, or the employee's or department's; those come later.
10. **The assignment names no payable account.** HRMS's `get_filtered_employees` picks only employees whose
    assignment's `payroll_payable_account` is the entry's. Capxul's assignment has none, so every assigned employee
    qualifies, and the entry alone names the account. (Found by the 🔍 review after core's confirmation of 1 to 9.)

## Framework gaps (for core)

1. **One operation can't run another** (snag #1079). `payroll-entry.submit-slips` should post through `journal-entry.create` and
   `journal-entry.submit`. No handler can call another operation, so its step writes the Journal Entry (in
   `submitted`), its Journal Entry Account rows and its GL Entry rows itself, in the shape 7a's handlers write them
   (`writes: [PayrollEntry, SalarySlip, JournalEntry, JournalEntryAccount, GLEntry]`). Two costs: 7a's rules (balance,
   the fiscal year) are judged again in the payroll handler (hence `AccrualOutsideFiscalYear`), and the journal
   entry's own events (`JournalEntryDrafted`, `JournalEntrySubmitted`) aren't written. The checks read the entry back
   through 7a's reads, so a build that writes a different shape fails them.
2. **An `undefined` in a step's expected value renders two ways** (snag #1031). With `expect(...).toEqual([..., undefined])`,
   `ortho generate` wrote `null` into the journey's docs and `ortho check` rendered `undefined`, so `check` reported
   drift on a freshly generated `generated/docs/salary-slip/get.md` and `generated/portal/blueprint.json`. The journey
   compares `journalEntry === undefined` with `true` instead.

## Known limits (9b and 9c, and later)

Skipping a leaver at create and paying full months with no payment days (items 3 and 4 above), which 9c revisits.
Tax: income tax slabs, tax components, exemption categories, declarations and proofs, `variable_based_on_taxable_salary`,
the payroll period's sub-periods (9b). Additional salary, salary withholding, payroll settings (payment days, leave
without pay, attendance, holidays, rounding, emailing slips) and scheduling a payroll by frequency (9c). Formulas and
conditions; flexible benefits; timesheet pay; loans; employee advances; employee-wise accounting; payroll cost center
splits; the bank entry that pays the net pay; cancelling and amending a payroll entry, a slip or a structure; bulk
assignment; gratuity and retention bonus; full and final settlement.
