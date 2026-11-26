// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/customer/thing.ts";
import type * as Events from "../../../../blueprint/things/customer/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a customer moves between, as its machine declares them. */
export type CustomerState = "active" | "disabled";

/** Someone a company sells to and receives money from. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Customer = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "customerName": Of<Declared["customerName"]>;
  readonly "customerType": Of<Declared["customerType"]>;
  readonly "customerGroup"?: Of<Declared["customerGroup"]>;
  readonly "state": CustomerState;
};

/** The event CustomerCreated: what it carries when a customer moves. */
export type CustomerCreated = {
  readonly "customer": Of<(typeof Events)["CustomerCreated"]["fields"]["customer"]>;
  readonly "company": Of<(typeof Events)["CustomerCreated"]["fields"]["company"]>;
};

/** The event CustomerDisabled: what it carries when a customer moves. */
export type CustomerDisabled = {
  readonly "customer": Of<(typeof Events)["CustomerDisabled"]["fields"]["customer"]>;
};

/** The event CustomerEnabled: what it carries when a customer moves. */
export type CustomerEnabled = {
  readonly "customer": Of<(typeof Events)["CustomerEnabled"]["fields"]["customer"]>;
};
