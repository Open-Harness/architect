import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { CriteriaName } from "../../values/appraisals.ts";

// HRMS's Employee Feedback Criteria (hrms/hr/doctype/employee_feedback_criteria): one name, which names it. HRMS's are
// site-wide; Capxul's are each company's, unique by name in it (`decisions/CX-appraisals.md`).
export const EmployeeFeedbackCriteria = Blueprint.thing({
  description: "Something a company rates its people on, in self-appraisals and colleagues' feedback.",
  code: "FC",
  fields: { id: Blueprint.id("efc"), company: Company.fields.id, criteria: CriteriaName },
});
