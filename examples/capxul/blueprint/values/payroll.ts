import { Blueprint } from "orthograph";

/** What a salary component is called (HRMS's Salary Component `salary_component`, which names it): Basic, Housing, Pension. */
export const ComponentName = Blueprint.value(Blueprint.text({ max: 140 }));
/** Whether a component is paid to the employee or held back from their pay (HRMS's Salary Component `type`). */
export const ComponentType = Blueprint.value(Blueprint.oneOf(["Earning", "Deduction"]));
/** What a salary structure is called (HRMS names a Salary Structure by prompt): Engineers, Leads. */
export const StructureName = Blueprint.value(Blueprint.text({ max: 140 }));
/** What a payroll period is called (HRMS names a Payroll Period by prompt): 2026, or 2026-2027. */
export const PeriodName = Blueprint.value(Blueprint.text({ max: 140 }));
/**
 * Where a salary slip stands (HRMS's Salary Slip `status`, without Withheld and Cancelled, which come with withholding
 * and with cancelling a payroll entry): a draft until its payroll entry submits it.
 */
export const SlipStatus = Blueprint.value(Blueprint.oneOf(["Draft", "Submitted"]));
/** How many employees or salary slips a payroll entry holds (HRMS's `number_of_employees`). */
export const EmployeeCount = Blueprint.value(Blueprint.uint(16));
