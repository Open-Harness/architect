import { Blueprint } from "orthograph";
import { JobOpening } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// Closing takes no new applicants (Job Applicant's `before_insert`). Those already in go on.
export default Blueprint.operation(JobOpening, {
  description: "Close a job opening to new applicants.",
  payload: { jobOpening: JobOpening.fields.id },
  answer: { jobOpening: JobOpening.fields.id },
  move: machine.moves.close,
  allowed: [owner.of("jobOpening.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
