import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";
import { Employee } from "../employee/thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// `payroll-entry.create` refuses, in order: PayrollEndsBeforeStart; PayableAccountNotInCompany, PayableAccountIsGroup,
// PayableAccountHasType; PayrollCostCenterNotInCompany, PayrollCostCenterIsGroup; then NoEmployeesFound.
// `payroll-entry.submit` refuses SalarySlipExists over every employee (HRMS's `before_submit`), then
// NoAssignmentAtStart (each slip's `set_salary_structure_assignment`). `payroll-entry.submit-slips` refuses
// AccrualOutsideFiscalYear.
/** The last day is before the first. HRMS's slip judges it (`validate_from_to_dates`); Capxul judges the entry. It carries the first day. */
export class PayrollEndsBeforeStart extends Blueprint.error({ startDate: Day }, { exit: 41 }) {}
/** The payable account belongs to another company: the accrual entry's `validate_account_head`, judged when the entry is made. */
export class PayableAccountNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** The payable account is a group: the accrual entry's `validate_account_head`, judged when the entry is made. */
export class PayableAccountIsGroup extends Blueprint.error({}, { exit: 43 }) {}
/**
 * HRMS's `validate_payroll_payable_account`: "Account type cannot be set for payroll payable account", as a Payable
 * account needs a party on every line. HRMS judges it on submit; nothing changes an account's type, so Capxul judges it
 * when the entry is made.
 */
export class PayableAccountHasType extends Blueprint.error({}, { exit: 44 }) {}
/** The cost center belongs to another company: the GL Entry's `validate_cost_center`, judged when the entry is made. */
export class PayrollCostCenterNotInCompany extends Blueprint.error({}, { exit: 45 }) {}
/** The cost center is a group: the GL Entry's `validate_cost_center`, judged when the entry is made. */
export class PayrollCostCenterIsGroup extends Blueprint.error({}, { exit: 46 }) {}
/**
 * HRMS's `fill_employee_details`: "No employees found for the mentioned criteria". No employee of the company is at work,
 * joined by the last day, holds a submitted assignment starting by then, and has no submitted slip for these very days.
 */
export class NoEmployeesFound extends Blueprint.error({}, { exit: 47 }) {}
/**
 * HRMS's `validate_existing_salary_slips`: "Salary Slip already exists for … for the given dates": a salary slip of one
 * of the entry's employees, draft or submitted, from another entry, covers these very days. It carries one such employee.
 */
export class SalarySlipExists extends Blueprint.error({ employee: Employee.fields.id }, { exit: 48 }) {}
/**
 * HRMS's `set_salary_structure_assignment`: "Please assign a Salary Structure for Employee … applicable from or before …".
 * The structure is the one of the employee's latest submitted assignment starting by the last day; some submitted
 * assignment to that structure must start by the first day, or by the joining day for an employee who joined inside the
 * span. It carries one such employee.
 */
export class NoAssignmentAtStart extends Blueprint.error({ employee: Employee.fields.id }, { exit: 49 }) {}
/**
 * The accrual journal entry's posting day falls in none of the company's fiscal years: the submit of the journal entry
 * HRMS makes refuses it (`get_fiscal_year`), and HRMS rolls the submission back. It carries the posting day.
 */
export class AccrualOutsideFiscalYear extends Blueprint.error({ postingDate: Day }, { exit: 50 }) {}
