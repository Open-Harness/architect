// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/interview/thing.ts";
import type * as Events from "../../../../blueprint/things/interview/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an interview moves between, as its machine declares them. */
export type InterviewState = "pending" | "cleared" | "rejected";

/** An applicant's interview at one round of hiring, on a day, between two times. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Interview = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "jobApplicant": Of<Declared["jobApplicant"]>;
  readonly "interviewRound": Of<Declared["interviewRound"]>;
  readonly "scheduledOn": Of<Declared["scheduledOn"]>;
  readonly "fromTime": Of<Declared["fromTime"]>;
  readonly "toTime": Of<Declared["toTime"]>;
  readonly "interviewers": Of<Declared["interviewers"]>;
  readonly "state": InterviewState;
};

/** The event InterviewCleared: what it carries when an interview moves. */
export type InterviewCleared = {
  readonly "interview": Of<(typeof Events)["InterviewCleared"]["fields"]["interview"]>;
};

/** The event InterviewRejected: what it carries when an interview moves. */
export type InterviewRejected = {
  readonly "interview": Of<(typeof Events)["InterviewRejected"]["fields"]["interview"]>;
};

/** The event InterviewScheduled: what it carries when an interview moves. */
export type InterviewScheduled = {
  readonly "interview": Of<(typeof Events)["InterviewScheduled"]["fields"]["interview"]>;
  readonly "jobApplicant": Of<(typeof Events)["InterviewScheduled"]["fields"]["jobApplicant"]>;
  readonly "interviewRound": Of<(typeof Events)["InterviewScheduled"]["fields"]["interviewRound"]>;
};
