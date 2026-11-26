import { Blueprint } from "orthograph";
import { Appraisal } from "./thing.ts";
import { AppraisalAlreadyExists } from "./errors.ts";

// HRMS's `validate_duplicate`: one appraisal per employee per cycle. HRMS also refuses one whose days overlap another
// cycle's appraisal of the employee; that waits (`decisions/CX-appraisals.md`).
export const oneAppraisalPerCycle = Blueprint.invariant.unique([Appraisal.fields.employee, Appraisal.fields.appraisalCycle], {
  refuse: AppraisalAlreadyExists,
});
