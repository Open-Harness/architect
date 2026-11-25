import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { machine } from "../machine.ts";
import { AppraisalCycleCompleted, AppraisalTemplateNotInCompany, AppraisedEmployeeHasLeft, AppraisedEmployeeNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// HRMS's Appraisal made by hand: from the cycle, with a template. Its company and method are the cycle's, its KRA
// lines and criteria the template's (`set_kras_and_rating_criteria`), with every score and rating 0: a goal needs its
// appraisal first, so none counts yet. Refusal order (errors.ts); AppraisalAlreadyExists is the rule's, refused at commit.
export default Blueprint.operation(Appraisal, {
  description: "Make an employee's appraisal in a cycle, by a template.",
  payload: { employee: Appraisal.fields.employee, appraisalCycle: Appraisal.fields.appraisalCycle, appraisalTemplate: Appraisal.fields.appraisalTemplate },
  answer: { appraisal: Appraisal.fields.id },
  move: machine.moves.create,
  errors: [AppraisedEmployeeNotInCompany, AppraisedEmployeeHasLeft, AppraisalCycleCompleted, AppraisalTemplateNotInCompany],
  allowed: [owner.of("appraisalCycle.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
