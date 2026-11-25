import { Blueprint } from "orthograph";
import { EmployeeSeparation } from "../thing.ts";
import { machine } from "../machine.ts";
import { SeparatedEmployeeNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// SeparationAlreadyOpen belongs to the rule in ../invariants.ts, and the runtime refuses it. HRMS's Employee
// Separation doesn't judge the employee's status or its days, so neither does this.
export default Blueprint.operation(EmployeeSeparation, {
  description: "Start an employee's separation, from their resignation letter.",
  payload: {
    company: EmployeeSeparation.fields.company,
    employee: EmployeeSeparation.fields.employee,
    resignationLetterDate: EmployeeSeparation.fields.resignationLetterDate,
    boardingBeginsOn: EmployeeSeparation.fields.boardingBeginsOn,
  },
  answer: { employeeSeparation: EmployeeSeparation.fields.id },
  move: machine.moves.create,
  errors: [SeparatedEmployeeNotInCompany],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
