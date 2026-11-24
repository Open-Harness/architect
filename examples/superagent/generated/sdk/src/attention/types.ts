// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/attention/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/attention/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an attention moves between, as its machine declares them. */
export type AttentionState = "open";

/** A question a person must answer, made by a report; a person's next message answers it. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Attention = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "question": Of<Declared["question"]>;
  readonly "state": AttentionState;
};

/** The event AttentionRaised: what it carries when an attention moves. */
export type AttentionRaised = {
  readonly "superagent": Of<(typeof Events)["AttentionRaised"]["fields"]["superagent"]>;
  readonly "attention": Of<(typeof Events)["AttentionRaised"]["fields"]["attention"]>;
  readonly "ticket": Of<(typeof Events)["AttentionRaised"]["fields"]["ticket"]>;
};
