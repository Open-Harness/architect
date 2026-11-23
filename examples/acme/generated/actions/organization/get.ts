// Generated from blueprint/things/organization/verbs/get.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/organization/get.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.organization.get>>;

/** Read one organization by its id: name, owner, state. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "organization.get",
  description: "Read one organization by its id: name, owner, state.",
  schema: declaration.payloadSchema,
  readOnly: true,
  needsApproval: false,
  agentTool: true,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.organization.get({ payload: args }), ctx),
});
