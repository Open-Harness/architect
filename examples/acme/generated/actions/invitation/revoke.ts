// Generated from blueprint/things/invitation/verbs/revoke.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/invitation/revoke.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.invitation.revoke>>;

/** Withdraw an invitation that hasn't been accepted. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "invitation.revoke",
  description: "Withdraw an invitation that hasn't been accepted.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { InvitationNotPending: "IN-900", NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.invitation.revoke({ payload: args }), ctx),
});
