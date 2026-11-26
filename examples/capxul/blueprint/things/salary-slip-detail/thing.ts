import { Blueprint } from "orthograph";
import { SalarySlip } from "../salary-slip/thing.ts";
import { SalaryComponent } from "../salary-component/thing.ts";
import { Amount } from "../../values/expenses.ts";
import { LineNumber } from "../../values/ledger.ts";
import { ComponentType } from "../../values/payroll.ts";

// HRMS's Salary Detail as a Salary Slip's child table: one row per line of the slip's structure, in its earnings or
// deductions (`type`), numbered from 1 within its table as on the structure. HRMS uses one doctype for a structure's
// lines and a slip's; here they are two things, so each has its own parent and reads. Only `payroll-entry.submit` writes
// them (`decisions/CX-payroll.md`).
export const SalarySlipDetail = Blueprint.thing({
  description: "One line of a salary slip: a component and what it paid.",
  code: "SE",
  fields: {
    id: Blueprint.id("sll"),
    salarySlip: SalarySlip.fields.id,
    type: ComponentType,
    line: LineNumber,
    salaryComponent: SalaryComponent.fields.id,
    amount: Amount,
  },
});
