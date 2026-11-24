// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/job-offer/thing.ts";
import type * as Events from "../../../../blueprint/things/job-offer/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a job-offer moves between, as its machine declares them. */
export type JobOfferState = "awaiting" | "accepted" | "rejected";

/** A job offered to an applicant, under one of the company's job titles. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type JobOffer = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "jobApplicant": Of<Declared["jobApplicant"]>;
  readonly "designation": Of<Declared["designation"]>;
  readonly "offerDate": Of<Declared["offerDate"]>;
  readonly "state": JobOfferState;
};

/** The event JobOfferAccepted: what it carries when a job-offer moves. */
export type JobOfferAccepted = {
  readonly "jobOffer": Of<(typeof Events)["JobOfferAccepted"]["fields"]["jobOffer"]>;
  readonly "jobApplicant": Of<(typeof Events)["JobOfferAccepted"]["fields"]["jobApplicant"]>;
};

/** The event JobOfferMade: what it carries when a job-offer moves. */
export type JobOfferMade = {
  readonly "jobOffer": Of<(typeof Events)["JobOfferMade"]["fields"]["jobOffer"]>;
  readonly "jobApplicant": Of<(typeof Events)["JobOfferMade"]["fields"]["jobApplicant"]>;
};

/** The event JobOfferRejected: what it carries when a job-offer moves. */
export type JobOfferRejected = {
  readonly "jobOffer": Of<(typeof Events)["JobOfferRejected"]["fields"]["jobOffer"]>;
  readonly "jobApplicant": Of<(typeof Events)["JobOfferRejected"]["fields"]["jobApplicant"]>;
};
