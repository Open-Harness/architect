import { Blueprint } from "orthograph";
import { JobApplicant } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// Needs no offer: an applicant may be turned down after an interview without one.
export default Blueprint.operation(JobApplicant, {
  description: "Turn an applicant down.",
  payload: { jobApplicant: JobApplicant.fields.id },
  answer: { jobApplicant: JobApplicant.fields.id },
  move: machine.moves.reject,
  allowed: [owner.of("jobApplicant.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
