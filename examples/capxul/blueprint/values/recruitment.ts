import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Employee } from "../things/employee/thing.ts";

/** How many people a job opening hires (HRMS's Job Opening `vacancies`). A whole number; the opening refuses 0. */
export const Vacancies = Blueprint.value(Blueprint.uint(16));
/** An applicant's email (HRMS's Job Applicant `email_id`). HRMS lets one email apply more than once, so it isn't unique. */
export const ApplicantEmail = Blueprint.email();
/**
 * The employees who interview (HRMS's Interviewer and Interview Detail rows, which name Users; Capxul names its
 * employees, who sign in as themselves). HRMS leaves both tables optional, so none is allowed; at most ten, in the order
 * given (a Capxul bound). Kept as JSON text, as Plugged In's profile links are: `prove`'s reader of the world's rows for a
 * role check decodes a row as stored, and doesn't parse a JSON column the way the store does.
 */
export const Interviewers = Blueprint.value(
  Schema.fromJsonString(Schema.Array(Employee.fields.id.value.schema).check(Schema.isMaxLength(10))),
);
/** What an interview or an interviewer's feedback found (HRMS's `result` and the end of Interview's `status`). */
export const InterviewResult = Blueprint.value(Schema.Literals(["Cleared", "Rejected"]));
