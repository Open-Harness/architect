import { Blueprint } from "orthograph";
import { Interview } from "./thing.ts";
import { InterviewAlreadyScheduled } from "./errors.ts";

// HRMS's `validate_duplicate_interview`: one interview per applicant per round. HRMS counts only submitted (cleared or
// rejected) ones; here the rule holds in every state, since counting by state needs a list (#764).
export const oneInterviewPerRound = Blueprint.invariant.unique([Interview.fields.jobApplicant, Interview.fields.interviewRound], {
  refuse: InterviewAlreadyScheduled,
});
