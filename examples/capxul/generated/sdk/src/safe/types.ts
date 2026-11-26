// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/safe/thing.ts";
import type * as Events from "../../../../blueprint/things/safe/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a safe moves between, as its machine declares them. */
export type SafeState = "counterfactual";

/** A Safe: a person's own on-chain account, or a company's, at the address it has before it is deployed. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Safe = {
  readonly "id": Of<Declared["id"]>;
  /** Whose it is: a person's own, or a company's. */
  readonly "kind": Of<Declared["kind"]>;
  /** Whose Safe it is, when it is a person's. */
  readonly "person"?: Of<Declared["person"]>;
  /** The company it is for, when it is a company's. */
  readonly "company"?: Of<Declared["company"]>;
  /** Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). */
  readonly "account": Of<Declared["account"]>;
  /** The one owner it is set up with, checksummed: the bootstrap key for a person's, the founder's own Safe for a company's. */
  readonly "firstOwner": Of<Declared["firstOwner"]>;
  /** Who owns it today: its first owner until the chain says otherwise. */
  readonly "owners": Of<Declared["owners"]>;
  /** How many owners must approve a transaction: 1 at setup. */
  readonly "threshold": Of<Declared["threshold"]>;
  /** The salt nonce its address is worked out from, kept so the address can be checked again. */
  readonly "saltNonce": Of<Declared["saltNonce"]>;
  readonly "state": SafeState;
};

/** The event CompanySafeRecorded: what it carries when a safe moves. */
export type CompanySafeRecorded = {
  readonly "safe": Of<(typeof Events)["CompanySafeRecorded"]["fields"]["safe"]>;
  /** The company it is for, when it is a company's. */
  readonly "company"?: Of<(typeof Events)["CompanySafeRecorded"]["fields"]["company"]>;
  /** Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). */
  readonly "account": Of<(typeof Events)["CompanySafeRecorded"]["fields"]["account"]>;
};

/** The event PersonalSafeRecorded: what it carries when a safe moves. */
export type PersonalSafeRecorded = {
  readonly "safe": Of<(typeof Events)["PersonalSafeRecorded"]["fields"]["safe"]>;
  /** Whose Safe it is, when it is a person's. */
  readonly "person"?: Of<(typeof Events)["PersonalSafeRecorded"]["fields"]["person"]>;
  /** Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). */
  readonly "account": Of<(typeof Events)["PersonalSafeRecorded"]["fields"]["account"]>;
};
