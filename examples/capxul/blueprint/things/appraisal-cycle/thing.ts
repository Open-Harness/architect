import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Day } from "../../values/employee.ts";
import { CycleName, EvaluationMethod } from "../../values/appraisals.ts";
import { Appraisees } from "../../values/appraisees.ts";

// HRMS's Appraisal Cycle (hrms/hr/doctype/appraisal_cycle): its name, company, days, KRA evaluation method and appraisee
// rows. HRMS's cycles are named site-wide; Capxul's are unique by name in their company. Its branch, department and job
// title filters (which only fill the rows) and the final score formula are left out (`decisions/CX-appraisals.md`).
export const AppraisalCycle = Blueprint.thing({
  description: "A period a company appraises its people over, and whom it appraises by which template.",
  code: "CY",
  fields: {
    id: Blueprint.id("apc"),
    company: Company.fields.id,
    cycleName: CycleName,
    startDate: Day,
    endDate: Day,
    kraEvaluationMethod: EvaluationMethod,
    appraisees: Appraisees,
  },
});
