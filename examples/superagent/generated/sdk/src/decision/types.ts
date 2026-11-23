// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/decision/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/decision/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a decision moves between, as its machine declares them. */
export type DecisionState = "recorded" | "dismissed";

/** What the main agent decided for an eval: each item accepted, attached, stopped or ignored. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Decision = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "eval": Of<Declared["eval"]>;
  readonly "items": Of<Declared["items"]>;
  readonly "state": DecisionState;
};

/** The event DecisionDismissed: what it carries when a decision moves. */
export type DecisionDismissed = {
  readonly "decision": Of<(typeof Events)["DecisionDismissed"]["fields"]["decision"]>;
};

/** The event DecisionRecorded: what it carries when a decision moves. */
export type DecisionRecorded = {
  readonly "superagent": Of<(typeof Events)["DecisionRecorded"]["fields"]["superagent"]>;
  readonly "decision": Of<(typeof Events)["DecisionRecorded"]["fields"]["decision"]>;
  readonly "eval": Of<(typeof Events)["DecisionRecorded"]["fields"]["eval"]>;
};
