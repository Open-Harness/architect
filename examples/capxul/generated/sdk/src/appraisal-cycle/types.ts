// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/appraisal-cycle/thing.ts";
import type * as Events from "../../../../blueprint/things/appraisal-cycle/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an appraisal-cycle moves between, as its machine declares them. */
export type AppraisalCycleState = "notStarted" | "inProgress" | "completed";

/** A period a company appraises its people over, and whom it appraises by which template. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type AppraisalCycle = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "cycleName": Of<Declared["cycleName"]>;
  readonly "startDate": Of<Declared["startDate"]>;
  readonly "endDate": Of<Declared["endDate"]>;
  readonly "kraEvaluationMethod": Of<Declared["kraEvaluationMethod"]>;
  readonly "appraisees": Of<Declared["appraisees"]>;
  readonly "state": AppraisalCycleState;
};

/** The event AppraisalCycleCompleted: what it carries when an appraisal-cycle moves. */
export type AppraisalCycleCompleted = {
  readonly "appraisalCycle": Of<(typeof Events)["AppraisalCycleCompleted"]["fields"]["appraisalCycle"]>;
};

/** The event AppraisalCycleCreated: what it carries when an appraisal-cycle moves. */
export type AppraisalCycleCreated = {
  readonly "appraisalCycle": Of<(typeof Events)["AppraisalCycleCreated"]["fields"]["appraisalCycle"]>;
  readonly "company": Of<(typeof Events)["AppraisalCycleCreated"]["fields"]["company"]>;
};

/** The event AppraisalCycleReopened: what it carries when an appraisal-cycle moves. */
export type AppraisalCycleReopened = {
  readonly "appraisalCycle": Of<(typeof Events)["AppraisalCycleReopened"]["fields"]["appraisalCycle"]>;
};

/** The event AppraisalCycleStarted: what it carries when an appraisal-cycle moves. */
export type AppraisalCycleStarted = {
  readonly "appraisalCycle": Of<(typeof Events)["AppraisalCycleStarted"]["fields"]["appraisalCycle"]>;
};
