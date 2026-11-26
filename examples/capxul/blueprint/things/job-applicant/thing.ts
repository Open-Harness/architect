import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { JobOpening } from "../job-opening/thing.ts";
import { Name } from "../../values/company.ts";
import { ApplicantEmail } from "../../values/recruitment.ts";

// HRMS's Job Applicant (hrms/hr/doctype/job_applicant): its name, its email and the opening applied for, which HRMS
// leaves optional and is required here until things have optional references (#742, item 5). Its company is the
// opening's, copied on create, so the owner reaches it. HRMS's email isn't unique: `autoname` appends a number to a
// repeated one, as "applicant can apply more than once for a different job title or reapply". Its source, referral,
// resume, rating and salary range come later (`decisions/CX-recruitment.md`).
export const JobApplicant = Blueprint.thing({
  description: "A person who applied for a job opening.",
  code: "JA",
  fields: {
    id: Blueprint.id("jap"),
    company: Company.fields.id,
    jobOpening: JobOpening.fields.id,
    applicantName: Name,
    email: ApplicantEmail,
  },
});
