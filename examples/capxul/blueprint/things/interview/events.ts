import { Blueprint } from "orthograph";
import { Interview } from "./thing.ts";

export const InterviewScheduled = Blueprint.event({
  interview: Interview.fields.id,
  jobApplicant: Interview.fields.jobApplicant,
  interviewRound: Interview.fields.interviewRound,
});
export const InterviewCleared = Blueprint.event({ interview: Interview.fields.id });
export const InterviewRejected = Blueprint.event({ interview: Interview.fields.id });
