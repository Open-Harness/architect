import { Blueprint } from "orthograph";
import { JobOffer } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// Moves only the offer. The applicant's own accept follows as a second call until #972 (`decisions/CX-recruitment.md`).
export default Blueprint.operation(JobOffer, {
  description: "Record that the applicant accepted the offer.",
  payload: { jobOffer: JobOffer.fields.id },
  answer: { jobOffer: JobOffer.fields.id, jobApplicant: JobOffer.fields.jobApplicant },
  move: machine.moves.accept,
  allowed: [owner.of("jobOffer.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
