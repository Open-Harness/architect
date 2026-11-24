// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/invitation/accept.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.invitation.accept>>;

/** Accept an invitation and become a member of its organisation. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "invitation.accept",
  description: "Accept an invitation and become a member of its organisation.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: false,
  errors: { InvitationNotPending: "IN-900", NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.invitation.accept({ payload: args }), ctx),
});
