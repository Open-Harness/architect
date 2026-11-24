// Generated from blueprint/things/invitation/verbs/send.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/invitation/send.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.invitation.send>>;

/** Invite someone to an organisation by email. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "invitation.send",
  description: "Invite someone to an organisation by email.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.invitation.send({ payload: args }), ctx),
});
