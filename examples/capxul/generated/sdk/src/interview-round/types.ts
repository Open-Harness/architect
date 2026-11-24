// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/interview-round/thing.ts";
import type * as Events from "../../../../blueprint/things/interview-round/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an interview-round moves between, as its machine declares them. */
export type InterviewRoundState = "active";

/** A stage of a company's hiring, and the employees who usually interview at it. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type InterviewRound = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "roundName": Of<Declared["roundName"]>;
  readonly "interviewers": Of<Declared["interviewers"]>;
  readonly "state": InterviewRoundState;
};

/** The event InterviewRoundCreated: what it carries when an interview-round moves. */
export type InterviewRoundCreated = {
  readonly "interviewRound": Of<(typeof Events)["InterviewRoundCreated"]["fields"]["interviewRound"]>;
  readonly "company": Of<(typeof Events)["InterviewRoundCreated"]["fields"]["company"]>;
};
