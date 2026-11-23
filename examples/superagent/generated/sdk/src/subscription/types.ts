// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/subscription/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/subscription/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a subscription moves between, as its machine declares them. */
export type SubscriptionState = "live" | "ended";

/** A ticket following one thread: its own, one attached, one for context, or one it is bound to. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Subscription = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "thread": Of<Declared["thread"]>;
  readonly "mode": Of<Declared["mode"]>;
  readonly "state": SubscriptionState;
};

/** The event SubscriptionEnded: what it carries when a subscription moves. */
export type SubscriptionEnded = {
  readonly "subscription": Of<(typeof Events)["SubscriptionEnded"]["fields"]["subscription"]>;
};

/** The event SubscriptionStarted: what it carries when a subscription moves. */
export type SubscriptionStarted = {
  readonly "subscription": Of<(typeof Events)["SubscriptionStarted"]["fields"]["subscription"]>;
  readonly "ticket": Of<(typeof Events)["SubscriptionStarted"]["fields"]["ticket"]>;
};
