// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/bridge-business/thing.ts";
import type * as Events from "../../../../blueprint/things/bridge-business/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a bridge-business moves between, as its machine declares them. */
export type BridgeBusinessState = "started" | "approved" | "rejected";

/** A company's KYB with Bridge: the check of who the business is, which its bank accounts need. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type BridgeBusiness = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  /** The company's name as it is registered, which Bridge checks. */
  readonly "legalName": Of<Declared["legalName"]>;
  /** Where Bridge writes to the business about its KYB. */
  readonly "email": Of<Declared["email"]>;
  /** Bridge's hosted KYB form for this business. */
  readonly "kybLink": Of<Declared["kybLink"]>;
  /** Bridge's terms of service, which the business accepts before it is approved. */
  readonly "tosLink": Of<Declared["tosLink"]>;
  readonly "state": BridgeBusinessState;
};

/** The event KybApproved: what it carries when a bridge-business moves. */
export type KybApproved = {
  readonly "business": Of<(typeof Events)["KybApproved"]["fields"]["business"]>;
};

/** The event KybRejected: what it carries when a bridge-business moves. */
export type KybRejected = {
  readonly "business": Of<(typeof Events)["KybRejected"]["fields"]["business"]>;
  readonly "reason": Of<(typeof Events)["KybRejected"]["fields"]["reason"]>;
};

/** The event KybStarted: what it carries when a bridge-business moves. */
export type KybStarted = {
  readonly "business": Of<(typeof Events)["KybStarted"]["fields"]["business"]>;
  readonly "company": Of<(typeof Events)["KybStarted"]["fields"]["company"]>;
};
