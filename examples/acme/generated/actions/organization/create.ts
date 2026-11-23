// Generated from blueprint/things/organization/verbs/create.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/organization/create.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.organization.create>>;

/** Found an organisation with its cap. Whoever founds it owns it, and is its first member. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "organization.create",
  description: "Found an organisation with its cap. Whoever founds it owns it, and is its first member.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.organization.create({ payload: args }), ctx),
});
