// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/interview-feedback/thing.ts";
import type * as Events from "../../../../blueprint/things/interview-feedback/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an interview-feedback moves between, as its machine declares them. */
export type InterviewFeedbackState = "given";

/** What one interviewer found at an interview. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type InterviewFeedback = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "interview": Of<Declared["interview"]>;
  readonly "interviewer": Of<Declared["interviewer"]>;
  readonly "result": Of<Declared["result"]>;
  readonly "state": InterviewFeedbackState;
};

/** The event InterviewFeedbackGiven: what it carries when an interview-feedback moves. */
export type InterviewFeedbackGiven = {
  readonly "interviewFeedback": Of<(typeof Events)["InterviewFeedbackGiven"]["fields"]["interviewFeedback"]>;
  readonly "interview": Of<(typeof Events)["InterviewFeedbackGiven"]["fields"]["interview"]>;
  readonly "interviewer": Of<(typeof Events)["InterviewFeedbackGiven"]["fields"]["interviewer"]>;
  readonly "result": Of<(typeof Events)["InterviewFeedbackGiven"]["fields"]["result"]>;
};
