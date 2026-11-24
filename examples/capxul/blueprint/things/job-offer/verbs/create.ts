import { Blueprint } from "orthograph";
import { JobOffer } from "../thing.ts";
import { machine } from "../machine.ts";
import { OfferDesignationNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// OfferAlreadyMade belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(JobOffer, {
  description: "Offer an applicant a job, under one of the company's job titles.",
  payload: {
    jobApplicant: JobOffer.fields.jobApplicant,
    designation: JobOffer.fields.designation,
    offerDate: JobOffer.fields.offerDate,
  },
  answer: { jobOffer: JobOffer.fields.id },
  move: machine.moves.create,
  errors: [OfferDesignationNotInCompany],
  allowed: [owner.of("jobApplicant.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
