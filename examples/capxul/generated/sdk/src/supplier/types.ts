// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/supplier/thing.ts";
import type * as Events from "../../../../blueprint/things/supplier/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a supplier moves between, as its machine declares them. */
export type SupplierState = "active" | "disabled";

/** Someone a company buys from and pays money to. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Supplier = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "supplierName": Of<Declared["supplierName"]>;
  readonly "supplierType": Of<Declared["supplierType"]>;
  readonly "supplierGroup"?: Of<Declared["supplierGroup"]>;
  readonly "state": SupplierState;
};

/** The event SupplierCreated: what it carries when a supplier moves. */
export type SupplierCreated = {
  readonly "supplier": Of<(typeof Events)["SupplierCreated"]["fields"]["supplier"]>;
  readonly "company": Of<(typeof Events)["SupplierCreated"]["fields"]["company"]>;
};

/** The event SupplierDisabled: what it carries when a supplier moves. */
export type SupplierDisabled = {
  readonly "supplier": Of<(typeof Events)["SupplierDisabled"]["fields"]["supplier"]>;
};

/** The event SupplierEnabled: what it carries when a supplier moves. */
export type SupplierEnabled = {
  readonly "supplier": Of<(typeof Events)["SupplierEnabled"]["fields"]["supplier"]>;
};
