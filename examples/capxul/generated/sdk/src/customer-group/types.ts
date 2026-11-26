// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/customer-group/thing.ts";
import type * as Events from "../../../../blueprint/things/customer-group/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a customer-group moves between, as its machine declares them. */
export type CustomerGroupState = "group" | "ledger";

/** A heading customers are grouped under in a company, kept as a tree with one root. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type CustomerGroup = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "customerGroupName": Of<Declared["customerGroupName"]>;
  readonly "parentCustomerGroup"?: Of<Declared["parentCustomerGroup"]>;
  readonly "state": CustomerGroupState;
};

/** The event CustomerGroupCreated: what it carries when a customer-group moves. */
export type CustomerGroupCreated = {
  readonly "customerGroup": Of<(typeof Events)["CustomerGroupCreated"]["fields"]["customerGroup"]>;
  readonly "company": Of<(typeof Events)["CustomerGroupCreated"]["fields"]["company"]>;
};
