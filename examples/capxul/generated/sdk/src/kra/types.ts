// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/kra/thing.ts";
import type * as Events from "../../../../blueprint/things/kra/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a kra moves between, as its machine declares them. */
export type KraState = "active";

/** A key result area a company appraises its people on. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Kra = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "state": KraState;
};

/** The event KraCreated: what it carries when a kra moves. */
export type KraCreated = {
  readonly "kra": Of<(typeof Events)["KraCreated"]["fields"]["kra"]>;
  readonly "company": Of<(typeof Events)["KraCreated"]["fields"]["company"]>;
};
