// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/superagent/blueprint/things/superagent/thing.js";
import type * as Events from "@orthograph/superagent/blueprint/things/superagent/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a superagent moves between, as its machine declares them. */
export type SuperagentState = "observing" | "live" | "paused" | "retired";

/** One always-on agent, stored as data. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Superagent = {
  readonly "id": Of<Declared["id"]>;
  readonly "name": Of<Declared["name"]>;
  readonly "purpose": Of<Declared["purpose"]>;
  readonly "connections": Of<Declared["connections"]>;
  readonly "playbook": Of<Declared["playbook"]>;
  readonly "slots": Of<Declared["slots"]>;
  readonly "main": Of<Declared["main"]>;
  readonly "pausedFrom": Of<Declared["pausedFrom"]>;
  readonly "pausedAt": Of<Declared["pausedAt"]>;
  readonly "pausedFor": Of<Declared["pausedFor"]>;
  readonly "passGen": Of<Declared["passGen"]>;
  readonly "revision": Of<Declared["revision"]>;
  readonly "saved": Of<Declared["saved"]>;
  readonly "state": SuperagentState;
};

/** The event SuperagentCreated: what it carries when a superagent moves. */
export type SuperagentCreated = {
  readonly "superagent": Of<(typeof Events)["SuperagentCreated"]["fields"]["superagent"]>;
};

/** The event SuperagentPaused: what it carries when a superagent moves. */
export type SuperagentPaused = {
  readonly "superagent": Of<(typeof Events)["SuperagentPaused"]["fields"]["superagent"]>;
  readonly "from": Of<(typeof Events)["SuperagentPaused"]["fields"]["from"]>;
  readonly "at": Of<(typeof Events)["SuperagentPaused"]["fields"]["at"]>;
};

/** The event SuperagentResumed: what it carries when a superagent moves. */
export type SuperagentResumed = {
  readonly "superagent": Of<(typeof Events)["SuperagentResumed"]["fields"]["superagent"]>;
  readonly "to": Of<(typeof Events)["SuperagentResumed"]["fields"]["to"]>;
  readonly "at": Of<(typeof Events)["SuperagentResumed"]["fields"]["at"]>;
  readonly "length": Of<(typeof Events)["SuperagentResumed"]["fields"]["length"]>;
};

/** The event SuperagentRetired: what it carries when a superagent moves. */
export type SuperagentRetired = {
  readonly "superagent": Of<(typeof Events)["SuperagentRetired"]["fields"]["superagent"]>;
};

/** The event SuperagentWentLive: what it carries when a superagent moves. */
export type SuperagentWentLive = {
  readonly "superagent": Of<(typeof Events)["SuperagentWentLive"]["fields"]["superagent"]>;
};
