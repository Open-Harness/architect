import { Blueprint } from "orthograph";
import { JobApplicant } from "../thing.ts";
import { machine } from "../machine.ts";
import { OpeningClosed } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// The applicant's company is the opening's, which the handler copies.
export default Blueprint.operation(JobApplicant, {
  description: "Add a person who applied for a job opening.",
  payload: {
    jobOpening: JobApplicant.fields.jobOpening,
    applicantName: JobApplicant.fields.applicantName,
    email: JobApplicant.fields.email,
  },
  answer: { jobApplicant: JobApplicant.fields.id },
  move: machine.moves.create,
  errors: [OpeningClosed],
  allowed: [owner.of("jobOpening.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
