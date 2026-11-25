import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `employee-promotion.create` refuses PromotedEmployeeNotInCompany, then PromotedEmployeeHasLeft,
// then NewDesignationNotInCompany, then DesignationUnchanged.
/** The employee named works for another company. Capxul's own refusal: HRMS copies `company` from the employee (`fetch_from`). */
export class PromotedEmployeeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * The employee has left. HRMS's form offers only Active employees (`employee_property_update.js`), and Capxul's rule
 * (`decisions/CX-expense-leavers.md`) judges it on create only: a promotion drafted before they left can still be
 * submitted and cancelled.
 */
export class PromotedEmployeeHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** The new job title belongs to another company. Capxul's own refusal: HRMS's designations are site-wide. */
export class NewDesignationNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** The new job title is the one the employee holds. HRMS's property dialog: "Nothing to change" (`employee_property_update.js`). */
export class DesignationUnchanged extends Blueprint.error({}, { exit: 44 }) {}
/**
 * HRMS's `before_submit`: "Employee Promotion cannot be submitted before Promotion Date", by the world's clock in UTC.
 * The day itself is allowed.
 */
export class PromotionNotYetDue extends Blueprint.error({ promotionDate: Day }, { exit: 45 }) {}
