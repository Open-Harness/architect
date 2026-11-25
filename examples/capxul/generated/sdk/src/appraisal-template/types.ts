// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/appraisal-template/thing.ts";
import type * as Events from "../../../../blueprint/things/appraisal-template/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an appraisal-template moves between, as its machine declares them. */
export type AppraisalTemplateState = "active";

/** The KRAs and criteria a company appraises a kind of job by, each with its share. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type AppraisalTemplate = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "kras": Of<Declared["kras"]>;
  readonly "criteria": Of<Declared["criteria"]>;
  readonly "state": AppraisalTemplateState;
};

/** The event AppraisalTemplateCreated: what it carries when an appraisal-template moves. */
export type AppraisalTemplateCreated = {
  readonly "appraisalTemplate": Of<(typeof Events)["AppraisalTemplateCreated"]["fields"]["appraisalTemplate"]>;
  readonly "company": Of<(typeof Events)["AppraisalTemplateCreated"]["fields"]["company"]>;
};
