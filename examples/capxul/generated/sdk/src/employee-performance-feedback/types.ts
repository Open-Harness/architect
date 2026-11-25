// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee-performance-feedback/thing.ts";
import type * as Events from "../../../../blueprint/things/employee-performance-feedback/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee-performance-feedback moves between, as its machine declares them. */
export type EmployeePerformanceFeedbackState = "draft" | "submitted";

/** What one colleague thinks of an employee's work, for their appraisal. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmployeePerformanceFeedback = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "appraisal": Of<Declared["appraisal"]>;
  readonly "appraisalCycle": Of<Declared["appraisalCycle"]>;
  /** The employee the feedback is about. */
  readonly "employee": Of<Declared["employee"]>;
  /** The employee who gives it. */
  readonly "reviewer": Of<Declared["reviewer"]>;
  readonly "feedback": Of<Declared["feedback"]>;
  readonly "ratings": Of<Declared["ratings"]>;
  /** The ratings' score out of 5 (HRMS's `total_score`). */
  readonly "totalScore": Of<Declared["totalScore"]>;
  readonly "state": EmployeePerformanceFeedbackState;
};

/** The event PerformanceFeedbackDrafted: what it carries when an employee-performance-feedback moves. */
export type PerformanceFeedbackDrafted = {
  readonly "employeePerformanceFeedback": Of<(typeof Events)["PerformanceFeedbackDrafted"]["fields"]["employeePerformanceFeedback"]>;
  readonly "appraisal": Of<(typeof Events)["PerformanceFeedbackDrafted"]["fields"]["appraisal"]>;
  /** The employee who gives it. */
  readonly "reviewer": Of<(typeof Events)["PerformanceFeedbackDrafted"]["fields"]["reviewer"]>;
  /** The ratings' score out of 5 (HRMS's `total_score`). */
  readonly "totalScore": Of<(typeof Events)["PerformanceFeedbackDrafted"]["fields"]["totalScore"]>;
};

/** The event PerformanceFeedbackSubmitted: what it carries when an employee-performance-feedback moves. */
export type PerformanceFeedbackSubmitted = {
  readonly "employeePerformanceFeedback": Of<(typeof Events)["PerformanceFeedbackSubmitted"]["fields"]["employeePerformanceFeedback"]>;
  readonly "appraisal": Of<(typeof Events)["PerformanceFeedbackSubmitted"]["fields"]["appraisal"]>;
  /** The ratings' score out of 5 (HRMS's `total_score`). */
  readonly "totalScore": Of<(typeof Events)["PerformanceFeedbackSubmitted"]["fields"]["totalScore"]>;
};
