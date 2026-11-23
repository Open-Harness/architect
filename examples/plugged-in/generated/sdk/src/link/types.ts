// Generated from blueprint/projections/sdk.ts. Do not edit.
import type * as Source from "../../../../blueprint/things/link/thing.ts";
import type * as Events from "../../../../blueprint/things/link/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a link moves between, as its machine declares them. */
export type LinkState = "listed" | "removed";

/** A title and web address on a public page. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Link = {
  /** The link's own id. */
  readonly "id": Of<Declared["id"]>;
  /** The page the link is on. */
  readonly "profile": Of<Declared["profile"]>;
  /** The person whose page the link is on. */
  readonly "owner": Of<Declared["owner"]>;
  /** What the link shows on the page, up to 120 characters. */
  readonly "title": Of<Declared["title"]>;
  /** Where the link goes: a web address starting with http:// or https://, up to 2048 characters. */
  readonly "url": Of<Declared["url"]>;
  readonly "state": LinkState;
};

/** The event LinkAdded: what it carries when a link moves. */
export type LinkAdded = {
  /** The link's own id. */
  readonly "link": Of<(typeof Events)["LinkAdded"]["fields"]["link"]>;
};

/** The event LinkRemoved: what it carries when a link moves. */
export type LinkRemoved = {
  /** The link's own id. */
  readonly "link": Of<(typeof Events)["LinkRemoved"]["fields"]["link"]>;
};
