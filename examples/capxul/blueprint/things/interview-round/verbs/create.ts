import { Blueprint } from "orthograph";
import { InterviewRound } from "../thing.ts";
import { machine } from "../machine.ts";
import { RoundInterviewerHasLeft, RoundInterviewerNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts): RoundInterviewerNotInCompany, then RoundInterviewerHasLeft. RoundNameTaken belongs to the
// rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(InterviewRound, {
  description: "Add a stage of hiring to a company, with the employees who interview at it.",
  payload: {
    company: InterviewRound.fields.company,
    roundName: InterviewRound.fields.roundName,
    interviewers: InterviewRound.fields.interviewers,
  },
  answer: { interviewRound: InterviewRound.fields.id },
  move: machine.moves.create,
  errors: [RoundInterviewerNotInCompany, RoundInterviewerHasLeft],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
