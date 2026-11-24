// Generated from blueprint/things/session/verbs/show.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/session/show.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.session.show>>;

/** Who is signed in. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "session.show",
  description: "Who is signed in.",
  schema: declaration.payloadSchema,
  readOnly: true,
  needsApproval: false,
  agentTool: true,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.session.show({ payload: args }), ctx),
});
