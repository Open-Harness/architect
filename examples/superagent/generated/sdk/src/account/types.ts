// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/intake/blueprint/things/account/thing.js";
import type * as Events from "@orthograph/intake/blueprint/things/account/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an account moves between, as its machine declares them. */
export type AccountState = "seen" | "listed" | "unlisted";

/** One account of an outside service, as a superagent has seen it, and whether its person is listed to ask. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Account = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "source": Of<Declared["source"]>;
  readonly "external": Of<Declared["external"]>;
  readonly "login": Of<Declared["login"]>;
  readonly "bot": Of<Declared["bot"]>;
  readonly "state": AccountState;
};

/** The event AccountListed: what it carries when an account moves. */
export type AccountListed = {
  readonly "account": Of<(typeof Events)["AccountListed"]["fields"]["account"]>;
};

/** The event AccountSeen: what it carries when an account moves. */
export type AccountSeen = {
  readonly "account": Of<(typeof Events)["AccountSeen"]["fields"]["account"]>;
  readonly "superagent": Of<(typeof Events)["AccountSeen"]["fields"]["superagent"]>;
};

/** The event AccountUnlisted: what it carries when an account moves. */
export type AccountUnlisted = {
  readonly "account": Of<(typeof Events)["AccountUnlisted"]["fields"]["account"]>;
};
