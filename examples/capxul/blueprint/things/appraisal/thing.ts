import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { AppraisalCycle } from "../appraisal-cycle/thing.ts";
import { AppraisalTemplate } from "../appraisal-template/thing.ts";
import { EvaluationMethod, Score } from "../../values/appraisals.ts";
import { AppraisalKras, CriteriaRatings } from "../../values/appraisal-lines.ts";

// HRMS's Appraisal (hrms/hr/doctype/appraisal): the employee, the cycle and the template, the cycle's method (HRMS's
// `rate_goals_manually`), the KRA lines (Appraisal KRA under the automated method, Appraisal Goal under Manual Rating,
// one list here), the self ratings, and the four scores. Its company is the cycle's. Its reflections, remarks, copied
// names and days, and HRMS's `goal_score_percentage` (the total score times 20) are left out (`decisions/CX-appraisals.md`).
export const Appraisal = Blueprint.thing({
  description: "How one employee did over one appraisal cycle.",
  code: "AP",
  fields: {
    id: Blueprint.id("apr"),
    company: Company.fields.id,
    employee: Employee.fields.id,
    appraisalCycle: AppraisalCycle.fields.id,
    appraisalTemplate: AppraisalTemplate.fields.id,
    kraEvaluationMethod: EvaluationMethod,
    kras: AppraisalKras,
    selfRatings: CriteriaRatings,
    totalScore: Blueprint.described(Score, "The KRAs' score out of 5 (HRMS's `total_score`)."),
    selfScore: Blueprint.described(Score, "The self ratings' score out of 5 (HRMS's `self_score`)."),
    avgFeedbackScore: Blueprint.described(Score, "The average of the submitted feedback's scores, out of 5 (HRMS's `avg_feedback_score`)."),
    finalScore: Blueprint.described(Score, "The average of the three scores above (HRMS's `final_score`)."),
  },
});
