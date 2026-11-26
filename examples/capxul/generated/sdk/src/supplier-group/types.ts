// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/supplier-group/thing.ts";
import type * as Events from "../../../../blueprint/things/supplier-group/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a supplier-group moves between, as its machine declares them. */
export type SupplierGroupState = "group" | "ledger";

/** A heading suppliers are grouped under in a company, kept as a tree with one root. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type SupplierGroup = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "supplierGroupName": Of<Declared["supplierGroupName"]>;
  readonly "parentSupplierGroup"?: Of<Declared["parentSupplierGroup"]>;
  readonly "state": SupplierGroupState;
};

/** The event SupplierGroupCreated: what it carries when a supplier-group moves. */
export type SupplierGroupCreated = {
  readonly "supplierGroup": Of<(typeof Events)["SupplierGroupCreated"]["fields"]["supplierGroup"]>;
  readonly "company": Of<(typeof Events)["SupplierGroupCreated"]["fields"]["company"]>;
};
