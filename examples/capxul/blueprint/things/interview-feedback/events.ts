import { Blueprint } from "orthograph";
import { InterviewFeedback } from "./thing.ts";

export const InterviewFeedbackGiven = Blueprint.event({
  interviewFeedback: InterviewFeedback.fields.id,
  interview: InterviewFeedback.fields.interview,
  interviewer: InterviewFeedback.fields.interviewer,
  result: InterviewFeedback.fields.result,
});
