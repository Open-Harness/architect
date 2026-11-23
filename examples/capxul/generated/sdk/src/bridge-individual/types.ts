// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/bridge-individual/thing.ts";
import type * as Events from "../../../../blueprint/things/bridge-individual/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a bridge-individual moves between, as its machine declares them. */
export type BridgeIndividualState = "started" | "approved" | "rejected";

/** A person's KYC with Bridge: the check of who they are. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type BridgeIndividual = {
  readonly "id": Of<Declared["id"]>;
  /** The person checked, who started it. */
  readonly "person": Of<Declared["person"]>;
  /** The person's name as their documents give it, which Bridge checks. */
  readonly "fullName": Of<Declared["fullName"]>;
  /** Where Bridge writes to the person about their KYC. */
  readonly "email": Of<Declared["email"]>;
  /** Bridge's hosted KYC form for this person. */
  readonly "kycLink": Of<Declared["kycLink"]>;
  /** Bridge's terms of service, which the person accepts before they are approved. */
  readonly "tosLink": Of<Declared["tosLink"]>;
  readonly "state": BridgeIndividualState;
};

/** The event KycApproved: what it carries when a bridge-individual moves. */
export type KycApproved = {
  readonly "individual": Of<(typeof Events)["KycApproved"]["fields"]["individual"]>;
};

/** The event KycRejected: what it carries when a bridge-individual moves. */
export type KycRejected = {
  readonly "individual": Of<(typeof Events)["KycRejected"]["fields"]["individual"]>;
  readonly "reason": Of<(typeof Events)["KycRejected"]["fields"]["reason"]>;
};

/** The event KycStarted: what it carries when a bridge-individual moves. */
export type KycStarted = {
  readonly "individual": Of<(typeof Events)["KycStarted"]["fields"]["individual"]>;
  /** The person checked, who started it. */
  readonly "person": Of<(typeof Events)["KycStarted"]["fields"]["person"]>;
};
