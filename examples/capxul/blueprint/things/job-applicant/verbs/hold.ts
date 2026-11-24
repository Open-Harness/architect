import { Blueprint } from "orthograph";
import { JobApplicant } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

export default Blueprint.operation(JobApplicant, {
  description: "Put an applicant on hold.",
  payload: { jobApplicant: JobApplicant.fields.id },
  answer: { jobApplicant: JobApplicant.fields.id },
  move: machine.moves.hold,
  allowed: [owner.of("jobApplicant.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
