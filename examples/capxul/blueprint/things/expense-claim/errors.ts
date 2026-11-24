import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When both apply, `expense-claim.create` refuses EmployeeNotInCompany before ClaimantNotActive.
/** HRMS's `validate_active_employee`: a claim is only for an employee still at work. */
export class ClaimantNotActive extends Blueprint.error({}, { exit: 41 }) {}
/** The employee named works for another company. */
export class EmployeeNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** HRMS's `expenses` table is required: a claim with nothing claimed (its claimed total is 0) can't be approved. */
export class ClaimHasNoExpenses extends Blueprint.error({}, { exit: 43 }) {}
