// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/mandate/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/mandate/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a mandate moves between, as its machine declares them. */
export type MandateState = "held" | "withdrawn" | "revoked";

/** What a ticket may do, pinned to the policy version it was accepted under. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Mandate = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "account": Of<Declared["account"]>;
  readonly "policy": Of<Declared["policy"]>;
  readonly "state": MandateState;
};

/** The event MandateHeld: what it carries when a mandate moves. */
export type MandateHeld = {
  readonly "mandate": Of<(typeof Events)["MandateHeld"]["fields"]["mandate"]>;
  readonly "ticket": Of<(typeof Events)["MandateHeld"]["fields"]["ticket"]>;
};

/** The event MandateRevalidated: what it carries when a mandate moves. */
export type MandateRevalidated = {
  readonly "mandate": Of<(typeof Events)["MandateRevalidated"]["fields"]["mandate"]>;
  readonly "ticket": Of<(typeof Events)["MandateRevalidated"]["fields"]["ticket"]>;
};

/** The event MandateWithdrawn: what it carries when a mandate moves. */
export type MandateWithdrawn = {
  readonly "mandate": Of<(typeof Events)["MandateWithdrawn"]["fields"]["mandate"]>;
  readonly "ticket": Of<(typeof Events)["MandateWithdrawn"]["fields"]["ticket"]>;
};
