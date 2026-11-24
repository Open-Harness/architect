// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/correlation/thing.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** A trigger seen on another thread: it adds context to a judgement and never routes. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Correlation = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "trigger": Of<Declared["trigger"]>;
  readonly "thread": Of<Declared["thread"]>;
};
