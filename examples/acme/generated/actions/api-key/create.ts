// Generated from blueprint/things/api-key/verbs/create.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/api-key/create.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.apiKey.create>>;

/** Create an API key in an organisation. The key itself is shown once. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "api-key.create",
  description: "Create an API key in an organisation. The key itself is shown once.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: false,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client["api-key"].create({ payload: args }), ctx),
});
