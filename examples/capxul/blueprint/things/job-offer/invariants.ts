import { Blueprint } from "orthograph";
import { JobOffer } from "./thing.ts";
import { OfferAlreadyMade } from "./errors.ts";

// HRMS's `validate`: one offer per applicant, in every state but cancelled, which Capxul doesn't have yet.
// `job-applicant.accept` finds the applicant's offer through this rule (`findBy`).
export const oneOfferPerApplicant = Blueprint.invariant.unique(JobOffer.fields.jobApplicant, { refuse: OfferAlreadyMade });
