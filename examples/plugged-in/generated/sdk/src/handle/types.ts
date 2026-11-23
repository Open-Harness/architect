// Generated from blueprint/projections/sdk.ts. Do not edit.
import type * as Source from "../../../../blueprint/things/handle/thing.ts";
import type * as Events from "../../../../blueprint/things/handle/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a handle moves between, as its machine declares them. */
export type HandleState = "claimed" | "released";

/** A public name that belongs to one person until they release it, and is the address of a public page. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Handle = {
  /** The handle's own id. */
  readonly "id": Of<Declared["id"]>;
  /** A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. */
  readonly "name": Of<Declared["name"]>;
  /** The person who holds the name. */
  readonly "owner": Of<Declared["owner"]>;
  readonly "state": HandleState;
};

/** The event HandleClaimed: what it carries when a handle moves. */
export type HandleClaimed = {
  /** The handle's own id. */
  readonly "handle": Of<(typeof Events)["HandleClaimed"]["fields"]["handle"]>;
  /** A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. */
  readonly "name": Of<(typeof Events)["HandleClaimed"]["fields"]["name"]>;
};

/** The event HandleReleased: what it carries when a handle moves. */
export type HandleReleased = {
  /** The handle's own id. */
  readonly "handle": Of<(typeof Events)["HandleReleased"]["fields"]["handle"]>;
  /** A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. */
  readonly "name": Of<(typeof Events)["HandleReleased"]["fields"]["name"]>;
};
