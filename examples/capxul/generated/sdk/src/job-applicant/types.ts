// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/job-applicant/thing.ts";
import type * as Events from "../../../../blueprint/things/job-applicant/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a job-applicant moves between, as its machine declares them. */
export type JobApplicantState = "open" | "hold" | "rejected" | "accepted";

/** A person who applied for a job opening. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type JobApplicant = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "jobOpening": Of<Declared["jobOpening"]>;
  readonly "applicantName": Of<Declared["applicantName"]>;
  readonly "email": Of<Declared["email"]>;
  readonly "state": JobApplicantState;
};

/** The event JobApplicantAccepted: what it carries when a job-applicant moves. */
export type JobApplicantAccepted = {
  readonly "jobApplicant": Of<(typeof Events)["JobApplicantAccepted"]["fields"]["jobApplicant"]>;
};

/** The event JobApplicantCreated: what it carries when a job-applicant moves. */
export type JobApplicantCreated = {
  readonly "jobApplicant": Of<(typeof Events)["JobApplicantCreated"]["fields"]["jobApplicant"]>;
  readonly "company": Of<(typeof Events)["JobApplicantCreated"]["fields"]["company"]>;
  readonly "jobOpening": Of<(typeof Events)["JobApplicantCreated"]["fields"]["jobOpening"]>;
};

/** The event JobApplicantHeld: what it carries when a job-applicant moves. */
export type JobApplicantHeld = {
  readonly "jobApplicant": Of<(typeof Events)["JobApplicantHeld"]["fields"]["jobApplicant"]>;
};

/** The event JobApplicantRejected: what it carries when a job-applicant moves. */
export type JobApplicantRejected = {
  readonly "jobApplicant": Of<(typeof Events)["JobApplicantRejected"]["fields"]["jobApplicant"]>;
};
