// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/attention/thing.ts";
import type * as Events from "../../../../blueprint/things/attention/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an attention moves between, as its machine declares them. */
export type AttentionState = "open" | "approved" | "declined";

/** Something waiting on you: a promote, money past the cap, a credential, a question mid-mission. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Attention = {
  readonly "id": Of<Declared["id"]>;
  readonly "mission": Of<Declared["mission"]>;
  readonly "kind": Of<Declared["kind"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "why": Of<Declared["why"]>;
  readonly "task": Of<Declared["task"]>;
  readonly "state": AttentionState;
};

/** The event AttentionApproved: what it carries when an attention moves. */
export type AttentionApproved = {
  readonly "attention": Of<(typeof Events)["AttentionApproved"]["fields"]["attention"]>;
};

/** The event AttentionDeclined: what it carries when an attention moves. */
export type AttentionDeclined = {
  readonly "attention": Of<(typeof Events)["AttentionDeclined"]["fields"]["attention"]>;
  readonly "why": Of<(typeof Events)["AttentionDeclined"]["fields"]["why"]>;
};

/** The event AttentionRaised: what it carries when an attention moves. */
export type AttentionRaised = {
  readonly "attention": Of<(typeof Events)["AttentionRaised"]["fields"]["attention"]>;
  readonly "mission": Of<(typeof Events)["AttentionRaised"]["fields"]["mission"]>;
  readonly "kind": Of<(typeof Events)["AttentionRaised"]["fields"]["kind"]>;
  readonly "task": Of<(typeof Events)["AttentionRaised"]["fields"]["task"]>;
};
