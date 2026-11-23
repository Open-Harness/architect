// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/policy/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/policy/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a policy moves between, as its machine declares them. */
export type PolicyState = "current";

/** A superagent's rules: who may ask, how, and what it may accept. One current version, every save kept. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Policy = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "revision": Of<Declared["revision"]>;
  readonly "mode": Of<Declared["mode"]>;
  readonly "allowed": Of<Declared["allowed"]>;
  readonly "bots": Of<Declared["bots"]>;
  readonly "admission": Of<Declared["admission"]>;
  readonly "rules": Of<Declared["rules"]>;
  readonly "saved": Of<Declared["saved"]>;
  readonly "state": PolicyState;
};

/** The event PolicyChanged: what it carries when a policy moves. */
export type PolicyChanged = {
  readonly "superagent": Of<(typeof Events)["PolicyChanged"]["fields"]["superagent"]>;
  readonly "revision": Of<(typeof Events)["PolicyChanged"]["fields"]["revision"]>;
};
