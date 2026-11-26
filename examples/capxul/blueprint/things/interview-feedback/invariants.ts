import { Blueprint } from "orthograph";
import { InterviewFeedback } from "./thing.ts";
import { FeedbackAlreadyGiven } from "./errors.ts";

// HRMS's `validate_duplicate`: one feedback per interviewer per interview.
export const oneFeedbackPerInterviewer = Blueprint.invariant.unique([InterviewFeedback.fields.interview, InterviewFeedback.fields.interviewer], {
  refuse: FeedbackAlreadyGiven,
});
