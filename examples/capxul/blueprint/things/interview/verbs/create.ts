import { Blueprint } from "orthograph";
import { Interview } from "../thing.ts";
import { machine } from "../machine.ts";
import { ApplicantRejected, InterviewEndsBeforeStart, InterviewerHasLeft, InterviewerNotInCompany, RoundNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). InterviewAlreadyScheduled belongs to the rule in ../invariants.ts, and the runtime refuses
// it. Overlapping interviewers' times wait on a list (#764).
export default Blueprint.operation(Interview, {
  description: "Schedule an applicant's interview at a round, on a day, with the employees who interview.",
  payload: {
    jobApplicant: Interview.fields.jobApplicant,
    interviewRound: Interview.fields.interviewRound,
    scheduledOn: Interview.fields.scheduledOn,
    fromTime: Interview.fields.fromTime,
    toTime: Interview.fields.toTime,
    interviewers: Interview.fields.interviewers,
  },
  answer: { interview: Interview.fields.id },
  move: machine.moves.create,
  errors: [ApplicantRejected, RoundNotInCompany, InterviewEndsBeforeStart, InterviewerNotInCompany, InterviewerHasLeft],
  allowed: [owner.of("jobApplicant.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
