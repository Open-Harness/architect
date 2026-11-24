// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/prompts/blueprint/things/prompt-set/thing.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** What a team writes into its agents' prompts: sections, skills and overrides. One current version, every save kept. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type PromptSet = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "revision": Of<Declared["revision"]>;
  readonly "sections": Of<Declared["sections"]>;
  readonly "skills": Of<Declared["skills"]>;
  readonly "overrides": Of<Declared["overrides"]>;
  readonly "saved"?: Of<Declared["saved"]>;
};
