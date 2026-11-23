// Generated from blueprint/projections/sdk.ts. Do not edit.
import type * as Source from "../../../../blueprint/things/allowance/thing.ts";
import type * as Events from "../../../../blueprint/things/allowance/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an allowance moves between, as its machine declares them. */
export type AllowanceState = "active" | "exhausted" | "revoked";

/** Money a member may spend from their organisation, up to a limit each month. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Allowance = {
  readonly "id": Of<Declared["id"]>;
  readonly "organization": Of<Declared["organization"]>;
  readonly "member": Of<Declared["member"]>;
  readonly "limit": Of<Declared["limit"]>;
  readonly "spent": Of<Declared["spent"]>;
  readonly "state": AllowanceState;
};

/** The event AllowanceGranted: what it carries when an allowance moves. */
export type AllowanceGranted = {
  readonly "allowance": Of<(typeof Events)["AllowanceGranted"]["fields"]["allowance"]>;
  readonly "limit": Of<(typeof Events)["AllowanceGranted"]["fields"]["limit"]>;
};

/** The event AllowanceRevoked: what it carries when an allowance moves. */
export type AllowanceRevoked = {
  readonly "allowance": Of<(typeof Events)["AllowanceRevoked"]["fields"]["allowance"]>;
};

/** The event AllowanceSpent: what it carries when an allowance moves. */
export type AllowanceSpent = {
  readonly "allowance": Of<(typeof Events)["AllowanceSpent"]["fields"]["allowance"]>;
  readonly "amount": Of<(typeof Events)["AllowanceSpent"]["fields"]["amount"]>;
  readonly "memo": Of<(typeof Events)["AllowanceSpent"]["fields"]["memo"]>;
  readonly "remaining": Of<(typeof Events)["AllowanceSpent"]["fields"]["remaining"]>;
};
