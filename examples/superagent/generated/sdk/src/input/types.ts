// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/input/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/input/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an input moves between, as its machine declares them. */
export type InputState = "waiting" | "routed" | "delivered" | "failed";

/** One message for a ticket's executor, waiting for a seat, routed, delivered or failed. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Input = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "from": Of<Declared["from"]>;
  readonly "text": Of<Declared["text"]>;
  readonly "seq": Of<Declared["seq"]>;
  readonly "retryAt": Of<Declared["retryAt"]>;
  readonly "refusals": Of<Declared["refusals"]>;
  readonly "state": InputState;
};

/** The event InputDelivered: what it carries when an input moves. */
export type InputDelivered = {
  readonly "superagent": Of<(typeof Events)["InputDelivered"]["fields"]["superagent"]>;
  readonly "input": Of<(typeof Events)["InputDelivered"]["fields"]["input"]>;
};

/** The event InputFailed: what it carries when an input moves. */
export type InputFailed = {
  readonly "superagent": Of<(typeof Events)["InputFailed"]["fields"]["superagent"]>;
  readonly "input": Of<(typeof Events)["InputFailed"]["fields"]["input"]>;
};

/** The event InputRouted: what it carries when an input moves. */
export type InputRouted = {
  readonly "superagent": Of<(typeof Events)["InputRouted"]["fields"]["superagent"]>;
  readonly "input": Of<(typeof Events)["InputRouted"]["fields"]["input"]>;
  readonly "ticket": Of<(typeof Events)["InputRouted"]["fields"]["ticket"]>;
  readonly "agent": Of<(typeof Events)["InputRouted"]["fields"]["agent"]>;
  readonly "assignment": Of<(typeof Events)["InputRouted"]["fields"]["assignment"]>;
  readonly "text": Of<(typeof Events)["InputRouted"]["fields"]["text"]>;
};

/** The event InputStored: what it carries when an input moves. */
export type InputStored = {
  readonly "superagent": Of<(typeof Events)["InputStored"]["fields"]["superagent"]>;
  readonly "input": Of<(typeof Events)["InputStored"]["fields"]["input"]>;
  readonly "ticket": Of<(typeof Events)["InputStored"]["fields"]["ticket"]>;
};
