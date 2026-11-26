// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/personal-safe/thing.ts";
import type * as Events from "../../../../blueprint/things/personal-safe/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a personal-safe moves between, as its machine declares them. */
export type PersonalSafeState = "unclaimed";

/** A person's own Safe: opened first, then claimed with the key they sign with, which gives its address. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type PersonalSafe = {
  readonly "id": Of<Declared["id"]>;
  /** Whose Safe it is. */
  readonly "person": Of<Declared["person"]>;
  /** The salt nonce its address is worked out from, kept at open so the address can be checked again. */
  readonly "saltNonce": Of<Declared["saltNonce"]>;
  /** The key the person proved they hold, set at claim (S1b). */
  readonly "signer"?: Of<Declared["signer"]>;
  /** The one owner it is set up with, set at claim: the signer, on the environment's chain. */
  readonly "firstOwner"?: Of<Declared["firstOwner"]>;
  /** Its address once claimed, worked out before it is deployed, checksummed (EIP-55). */
  readonly "account"?: Of<Declared["account"]>;
  readonly "state": PersonalSafeState;
};

/** The event PersonalSafeOpened: what it carries when a personal-safe moves. */
export type PersonalSafeOpened = {
  readonly "safe": Of<(typeof Events)["PersonalSafeOpened"]["fields"]["safe"]>;
  /** Whose Safe it is. */
  readonly "person": Of<(typeof Events)["PersonalSafeOpened"]["fields"]["person"]>;
};
