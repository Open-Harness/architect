import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When both apply, `interview-feedback.give` refuses FeedbackGiverNotInterviewer, then FeedbackBeforeInterview, in the
// order of HRMS's `validate`; FeedbackAlreadyGiven is the rule's, refused at commit.
/** HRMS's `validate_interviewer`: only one of the interview's interviewers gives feedback on it. */
export class FeedbackGiverNotInterviewer extends Blueprint.error({}, { exit: 41 }) {}
/** HRMS's `validate_interview_date`: no feedback before the interview's day, by the world's clock (UTC). The day itself is allowed. */
export class FeedbackBeforeInterview extends Blueprint.error({ scheduledOn: Day }, { exit: 42 }) {}
/** HRMS's `validate_duplicate`: one feedback per interviewer per interview. */
export class FeedbackAlreadyGiven extends Blueprint.error({}, { exit: 43 }) {}
