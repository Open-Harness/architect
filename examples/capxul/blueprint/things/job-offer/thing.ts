import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { JobApplicant } from "../job-applicant/thing.ts";
import { Designation } from "../designation/thing.ts";
import { Day } from "../../values/employee.ts";

// HRMS's Job Offer (hrms/hr/doctype/job_offer): the applicant, the job title offered and the offer's day. Its company
// is the applicant's, copied on create. Its terms, pay and templates come later; any pay will be USDC base units
// (`decisions/CX-grill.md`, section 3). Staffing plans' vacancy check is left out (`decisions/CX-recruitment.md`).
export const JobOffer = Blueprint.thing({
  description: "A job offered to an applicant, under one of the company's job titles.",
  code: "JF",
  fields: {
    id: Blueprint.id("jof"),
    company: Company.fields.id,
    jobApplicant: JobApplicant.fields.id,
    designation: Designation.fields.id,
    offerDate: Day,
  },
});
