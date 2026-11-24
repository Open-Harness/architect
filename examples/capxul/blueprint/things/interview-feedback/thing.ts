import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Interview } from "../interview/thing.ts";
import { Employee } from "../employee/thing.ts";
import { InterviewResult } from "../../values/recruitment.ts";

// HRMS's Interview Feedback (hrms/hr/doctype/interview_feedback): the interview, the interviewer (a User in HRMS, an
// employee here) and the result. Its company is the interview's, copied on create. Its skill assessment, rating and
// written feedback come later (`decisions/CX-recruitment.md`).
export const InterviewFeedback = Blueprint.thing({
  description: "What one interviewer found at an interview.",
  code: "IF",
  fields: {
    id: Blueprint.id("ifb"),
    company: Company.fields.id,
    interview: Interview.fields.id,
    interviewer: Employee.fields.id,
    result: InterviewResult,
  },
});
