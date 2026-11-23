// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/invitation/thing.ts";
import type * as Events from "../../../../blueprint/things/invitation/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an invitation moves between, as its machine declares them. */
export type InvitationState = "pending" | "accepted" | "revoked";

/** An offer to join an organisation, sent to an email address. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Invitation = {
  readonly "id": Of<Declared["id"]>;
  readonly "organization": Of<Declared["organization"]>;
  readonly "email": Of<Declared["email"]>;
  readonly "invitedBy": Of<Declared["invitedBy"]>;
  readonly "state": InvitationState;
};

/** The event InvitationAccepted: what it carries when an invitation moves. */
export type InvitationAccepted = {
  readonly "invitation": Of<(typeof Events)["InvitationAccepted"]["fields"]["invitation"]>;
  readonly "membership": Of<(typeof Events)["InvitationAccepted"]["fields"]["membership"]>;
};

/** The event InvitationRevoked: what it carries when an invitation moves. */
export type InvitationRevoked = {
  readonly "invitation": Of<(typeof Events)["InvitationRevoked"]["fields"]["invitation"]>;
};

/** The event InvitationSent: what it carries when an invitation moves. */
export type InvitationSent = {
  readonly "invitation": Of<(typeof Events)["InvitationSent"]["fields"]["invitation"]>;
  readonly "email": Of<(typeof Events)["InvitationSent"]["fields"]["email"]>;
};
