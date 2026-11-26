import { Blueprint } from "orthograph";
import { SalaryStructure } from "../salary-structure/thing.ts";
import { SalaryComponent } from "../salary-component/thing.ts";
import { Amount } from "../../values/expenses.ts";
import { LineNumber } from "../../values/ledger.ts";
import { ComponentType } from "../../values/payroll.ts";

// HRMS's Salary Detail (hrms/payroll/doctype/salary_detail), the child table of a Salary Structure: one row per line,
// in its structure's earnings or deductions (HRMS's `parentfield`, here `type`), numbered from 1 within its table (HRMS's
// `idx`). Its amount is what the line pays, its component's own when the owner gave none. `salary-structure.create`
// writes them all with the structure; nothing else does. HRMS uses the same table for a slip's lines, which are Salary
// Slip Detail here. The formula, condition and flag columns are left out (`decisions/CX-payroll.md`).
export const SalaryDetail = Blueprint.thing({
  description: "One line of a salary structure: a component and what it pays.",
  code: "SD",
  fields: {
    id: Blueprint.id("sdl"),
    salaryStructure: SalaryStructure.fields.id,
    type: ComponentType,
    line: LineNumber,
    salaryComponent: SalaryComponent.fields.id,
    amount: Amount,
  },
});
