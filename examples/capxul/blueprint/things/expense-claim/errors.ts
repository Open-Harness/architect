import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When both apply, `expense-claim.create` refuses EmployeeNotInCompany before ClaimantNotActive.
/**
 * Capxul's own rule, not HRMS's: a new claim is only for an employee still at work (`decisions/CX-expense-leavers.md`).
 * HRMS's `validate_active_employee` refuses only an Inactive employee, on every save. Here it is judged on create alone,
 * so a claim already open when the employee leaves can still take lines and be approved, as a final settlement does.
 */
export class ClaimantNotActive extends Blueprint.error({}, { exit: 41 }) {}
/** The employee named works for another company. */
export class EmployeeNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** HRMS's `expenses` table is required: a claim with nothing claimed (its claimed total is 0) can't be approved. */
export class ClaimHasNoExpenses extends Blueprint.error({}, { exit: 43 }) {}
