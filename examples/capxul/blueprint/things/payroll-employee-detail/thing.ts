import { Blueprint } from "orthograph";
import { PayrollEntry } from "../payroll-entry/thing.ts";
import { Employee } from "../employee/thing.ts";

// HRMS's Payroll Employee Detail (hrms/payroll/doctype/payroll_employee_detail), the child table of a Payroll Entry:
// one row per employee it pays. `payroll-entry.create` writes them all with the entry; nothing else does. The name,
// department and designation HRMS copies are read from the employee; `is_salary_withheld` comes with withholding.
export const PayrollEmployeeDetail = Blueprint.thing({
  description: "One employee a payroll entry pays.",
  code: "PD",
  fields: {
    id: Blueprint.id("ped"),
    payrollEntry: PayrollEntry.fields.id,
    employee: Employee.fields.id,
  },
});
