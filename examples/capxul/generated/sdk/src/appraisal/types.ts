// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/appraisal/thing.ts";
import type * as Events from "../../../../blueprint/things/appraisal/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an appraisal moves between, as its machine declares them. */
export type AppraisalState = "draft" | "submitted";

/** How one employee did over one appraisal cycle. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Appraisal = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "appraisalCycle": Of<Declared["appraisalCycle"]>;
  readonly "appraisalTemplate": Of<Declared["appraisalTemplate"]>;
  readonly "kraEvaluationMethod": Of<Declared["kraEvaluationMethod"]>;
  readonly "kras": Of<Declared["kras"]>;
  readonly "selfRatings": Of<Declared["selfRatings"]>;
  /** The KRAs' score out of 5 (HRMS's `total_score`). */
  readonly "totalScore": Of<Declared["totalScore"]>;
  /** The self ratings' score out of 5 (HRMS's `self_score`). */
  readonly "selfScore": Of<Declared["selfScore"]>;
  /** The average of the submitted feedback's scores, out of 5 (HRMS's `avg_feedback_score`). */
  readonly "avgFeedbackScore": Of<Declared["avgFeedbackScore"]>;
  /** The average of the three scores above (HRMS's `final_score`). */
  readonly "finalScore": Of<Declared["finalScore"]>;
  readonly "state": AppraisalState;
};

/** The event AppraisalCreated: what it carries when an appraisal moves. */
export type AppraisalCreated = {
  readonly "appraisal": Of<(typeof Events)["AppraisalCreated"]["fields"]["appraisal"]>;
  readonly "employee": Of<(typeof Events)["AppraisalCreated"]["fields"]["employee"]>;
  readonly "appraisalCycle": Of<(typeof Events)["AppraisalCreated"]["fields"]["appraisalCycle"]>;
};

/** The event AppraisalRated: what it carries when an appraisal moves. */
export type AppraisalRated = {
  readonly "appraisal": Of<(typeof Events)["AppraisalRated"]["fields"]["appraisal"]>;
  /** The KRAs' score out of 5 (HRMS's `total_score`). */
  readonly "totalScore": Of<(typeof Events)["AppraisalRated"]["fields"]["totalScore"]>;
  /** The average of the three scores above (HRMS's `final_score`). */
  readonly "finalScore": Of<(typeof Events)["AppraisalRated"]["fields"]["finalScore"]>;
};

/** The event AppraisalSelfRated: what it carries when an appraisal moves. */
export type AppraisalSelfRated = {
  readonly "appraisal": Of<(typeof Events)["AppraisalSelfRated"]["fields"]["appraisal"]>;
  /** The self ratings' score out of 5 (HRMS's `self_score`). */
  readonly "selfScore": Of<(typeof Events)["AppraisalSelfRated"]["fields"]["selfScore"]>;
  /** The average of the three scores above (HRMS's `final_score`). */
  readonly "finalScore": Of<(typeof Events)["AppraisalSelfRated"]["fields"]["finalScore"]>;
};

/** The event AppraisalSubmitted: what it carries when an appraisal moves. */
export type AppraisalSubmitted = {
  readonly "appraisal": Of<(typeof Events)["AppraisalSubmitted"]["fields"]["appraisal"]>;
  /** The average of the three scores above (HRMS's `final_score`). */
  readonly "finalScore": Of<(typeof Events)["AppraisalSubmitted"]["fields"]["finalScore"]>;
};
