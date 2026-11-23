// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/eval/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/eval/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an eval moves between, as its machine declares them. */
export type EvalState = "queued" | "delivered" | "decided" | "unavailable";

/** One judgement the main agent is asked for: a thread's waiting triggers, batched. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Eval = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "thread": Of<Declared["thread"]>;
  readonly "triggers": Of<Declared["triggers"]>;
  readonly "activeAtStart": Of<Declared["activeAtStart"]>;
  readonly "timeoutMs": Of<Declared["timeoutMs"]>;
  readonly "state": EvalState;
};

/** The event EvalDecided: what it carries when an eval moves. */
export type EvalDecided = {
  readonly "eval": Of<(typeof Events)["EvalDecided"]["fields"]["eval"]>;
};

/** The event EvalDelivered: what it carries when an eval moves. */
export type EvalDelivered = {
  readonly "superagent": Of<(typeof Events)["EvalDelivered"]["fields"]["superagent"]>;
  readonly "eval": Of<(typeof Events)["EvalDelivered"]["fields"]["eval"]>;
};

/** The event EvalExpired: what it carries when an eval moves. */
export type EvalExpired = {
  readonly "eval": Of<(typeof Events)["EvalExpired"]["fields"]["eval"]>;
};

/** The event EvalStarted: what it carries when an eval moves. */
export type EvalStarted = {
  readonly "superagent": Of<(typeof Events)["EvalStarted"]["fields"]["superagent"]>;
  readonly "eval": Of<(typeof Events)["EvalStarted"]["fields"]["eval"]>;
  readonly "thread": Of<(typeof Events)["EvalStarted"]["fields"]["thread"]>;
};
