import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `employee-transfer.create` refuses TransferredEmployeeNotInCompany, then TransferredEmployeeHasLeft,
// then NewDepartmentNotInCompany, then DepartmentUnchanged.
/** The employee named works for another company. Capxul's own refusal: HRMS copies `company` from the employee (`fetch_from`). */
export class TransferredEmployeeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * The employee has left. HRMS's form offers only Active employees (`employee_property_update.js`), and Capxul's rule
 * (`decisions/CX-expense-leavers.md`) judges it on create only: a transfer drafted before they left can still be
 * submitted and cancelled.
 */
export class TransferredEmployeeHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** The new department belongs to another company. Capxul's own refusal: HRMS's departments are site-wide. */
export class NewDepartmentNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** The new department is the one the employee holds. HRMS's property dialog: "Nothing to change" (`employee_property_update.js`). */
export class DepartmentUnchanged extends Blueprint.error({}, { exit: 44 }) {}
/**
 * HRMS's `before_submit`: "Employee Transfer cannot be submitted before Transfer Date", by the world's clock in UTC.
 * The day itself is allowed.
 */
export class TransferNotYetDue extends Blueprint.error({ transferDate: Day }, { exit: 45 }) {}
