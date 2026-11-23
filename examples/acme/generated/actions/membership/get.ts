// Generated from blueprint/things/membership/verbs/get.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/membership/get.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.membership.get>>;

/** Read one membership by its id: organization, person, role. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "membership.get",
  description: "Read one membership by its id: organization, person, role.",
  schema: declaration.payloadSchema,
  readOnly: true,
  needsApproval: false,
  agentTool: true,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.membership.get({ payload: args }), ctx),
});
