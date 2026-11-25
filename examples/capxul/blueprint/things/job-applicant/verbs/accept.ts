import { Blueprint } from "orthograph";
import { JobApplicant } from "../thing.ts";
import { machine } from "../machine.ts";
import { OfferNotAccepted } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// The applicant's offer is found through the job offer's rule `oneOfferPerApplicant` (`findBy`). No offer, or one not
// accepted, is OfferNotAccepted. This is the second call HRMS's `update_job_applicant` makes in one, until #972.
export default Blueprint.operation(JobApplicant, {
  description: "Mark an applicant accepted, once they have accepted their job offer.",
  payload: { jobApplicant: JobApplicant.fields.id },
  answer: { jobApplicant: JobApplicant.fields.id },
  move: machine.moves.accept,
  errors: [OfferNotAccepted],
  allowed: [owner.of("jobApplicant.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
