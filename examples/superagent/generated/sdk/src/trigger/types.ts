// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/trigger/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/trigger/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a trigger moves between, as its machine declares them. */
export type TriggerState = "stored";

/** One event that came in from a connection. Never changed once stored. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Trigger = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "source": Of<Declared["source"]>;
  readonly "event": Of<Declared["event"]>;
  readonly "thread": Of<Declared["thread"]>;
  readonly "kind": Of<Declared["kind"]>;
  readonly "text": Of<Declared["text"]>;
  readonly "url": Of<Declared["url"]>;
  readonly "author": Of<Declared["author"]>;
  readonly "channel": Of<Declared["channel"]>;
  readonly "state": TriggerState;
};

/** The event TriggerReceived: what it carries when a trigger moves. */
export type TriggerReceived = {
  readonly "superagent": Of<(typeof Events)["TriggerReceived"]["fields"]["superagent"]>;
  readonly "trigger": Of<(typeof Events)["TriggerReceived"]["fields"]["trigger"]>;
  readonly "thread": Of<(typeof Events)["TriggerReceived"]["fields"]["thread"]>;
  readonly "text": Of<(typeof Events)["TriggerReceived"]["fields"]["text"]>;
};

/** The event TriggerRequeued: what it carries when a trigger moves. */
export type TriggerRequeued = {
  readonly "superagent": Of<(typeof Events)["TriggerRequeued"]["fields"]["superagent"]>;
  readonly "trigger": Of<(typeof Events)["TriggerRequeued"]["fields"]["trigger"]>;
};
