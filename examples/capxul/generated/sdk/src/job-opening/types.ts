// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/job-opening/thing.ts";
import type * as Events from "../../../../blueprint/things/job-opening/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a job-opening moves between, as its machine declares them. */
export type JobOpeningState = "open" | "closed";

/** A job a company is hiring for, and how many people it hires. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type JobOpening = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "designation": Of<Declared["designation"]>;
  readonly "jobTitle": Of<Declared["jobTitle"]>;
  readonly "vacancies": Of<Declared["vacancies"]>;
  readonly "state": JobOpeningState;
};

/** The event JobOpeningClosed: what it carries when a job-opening moves. */
export type JobOpeningClosed = {
  readonly "jobOpening": Of<(typeof Events)["JobOpeningClosed"]["fields"]["jobOpening"]>;
};

/** The event JobOpeningCreated: what it carries when a job-opening moves. */
export type JobOpeningCreated = {
  readonly "jobOpening": Of<(typeof Events)["JobOpeningCreated"]["fields"]["jobOpening"]>;
  readonly "company": Of<(typeof Events)["JobOpeningCreated"]["fields"]["company"]>;
  readonly "vacancies": Of<(typeof Events)["JobOpeningCreated"]["fields"]["vacancies"]>;
};
