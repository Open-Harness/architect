// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/employee-feedback-criteria/thing.ts";
import type * as Events from "../../../../blueprint/things/employee-feedback-criteria/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an employee-feedback-criteria moves between, as its machine declares them. */
export type EmployeeFeedbackCriteriaState = "active";

/** Something a company rates its people on, in self-appraisals and colleagues' feedback. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type EmployeeFeedbackCriteria = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "criteria": Of<Declared["criteria"]>;
  readonly "state": EmployeeFeedbackCriteriaState;
};

/** The event FeedbackCriteriaCreated: what it carries when an employee-feedback-criteria moves. */
export type FeedbackCriteriaCreated = {
  readonly "employeeFeedbackCriteria": Of<(typeof Events)["FeedbackCriteriaCreated"]["fields"]["employeeFeedbackCriteria"]>;
  readonly "company": Of<(typeof Events)["FeedbackCriteriaCreated"]["fields"]["company"]>;
};
