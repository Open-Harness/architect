import { Blueprint } from "orthograph";
import { InterviewFeedback } from "../thing.ts";
import { machine } from "../machine.ts";
import { FeedbackBeforeInterview, FeedbackGiverNotInterviewer } from "../errors.ts";
import { self } from "../../employee/roles.ts";

// Refusal order (errors.ts). FeedbackAlreadyGiven belongs to the rule in ../invariants.ts, and the runtime refuses it.
// A leaver may still give feedback on an interview they were put on: it finishes an open record (CX-expense-leavers).
// The interview's state isn't checked, as HRMS doesn't.
export default Blueprint.operation(InterviewFeedback, {
  description: "Give an interviewer's feedback on an interview: cleared or rejected.",
  payload: {
    interview: InterviewFeedback.fields.interview,
    interviewer: InterviewFeedback.fields.interviewer,
    result: InterviewFeedback.fields.result,
  },
  answer: { interviewFeedback: InterviewFeedback.fields.id },
  move: machine.moves.give,
  errors: [FeedbackGiverNotInterviewer, FeedbackBeforeInterview],
  allowed: [self.of("interviewer")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
