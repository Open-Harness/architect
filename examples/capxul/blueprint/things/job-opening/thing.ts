import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Designation } from "../designation/thing.ts";
import { Name } from "../../values/company.ts";
import { Vacancies } from "../../values/recruitment.ts";

// HRMS's Job Opening (hrms/hr/doctype/job_opening): its required fields and its vacancies. Its company is the job
// title's, copied on create, since a Capxul job title belongs to one company. Its department, employment type, branch,
// salary range, posting and closing dates wait on optional fields and references (#742, item 5). Its staffing plan and
// job requisition, and so the check of vacancies against a staffing plan, are left out of 8e
// (`decisions/CX-recruitment.md`). HRMS's `route` is a web path, not a rule, so two openings may share a title.
export const JobOpening = Blueprint.thing({
  description: "A job a company is hiring for, and how many people it hires.",
  code: "JO",
  fields: {
    id: Blueprint.id("jop"),
    company: Company.fields.id,
    designation: Designation.fields.id,
    jobTitle: Name,
    vacancies: Vacancies,
  },
});
