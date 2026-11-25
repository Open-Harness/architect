import { Blueprint } from "orthograph";
import { EmployeePromotion } from "../thing.ts";
import { machine } from "../machine.ts";
import { DesignationUnchanged, NewDesignationNotInCompany, PromotedEmployeeHasLeft, PromotedEmployeeNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). The current job title is the employee's, copied on create; it isn't in the payload.
// HRMS has no bound between the promotion's day and the joining day, so none is refused here.
export default Blueprint.operation(EmployeePromotion, {
  description: "Draft a promotion: an employee's new job title, from a day.",
  payload: {
    company: EmployeePromotion.fields.company,
    employee: EmployeePromotion.fields.employee,
    promotionDate: EmployeePromotion.fields.promotionDate,
    newDesignation: EmployeePromotion.fields.newDesignation,
  },
  answer: { employeePromotion: EmployeePromotion.fields.id },
  move: machine.moves.create,
  errors: [PromotedEmployeeNotInCompany, PromotedEmployeeHasLeft, NewDesignationNotInCompany, DesignationUnchanged],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
