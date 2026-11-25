// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/slack/blueprint/things/slack/thing.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** What Slack Web API fails with. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Slack = {
  readonly "id": Of<Declared["id"]>;
};
