// Generated from blueprint/things/allowance/verbs/revoke.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/allowance/revoke.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.allowance.revoke>>;

/** Stop an allowance. Nothing more can be spent from it. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "allowance.revoke",
  description: "Stop an allowance. Nothing more can be spent from it.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { AllowanceNotActive: "AL-900", NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.allowance.revoke({ payload: args }), ctx),
});
