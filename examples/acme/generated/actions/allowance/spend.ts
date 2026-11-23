// Generated from blueprint/things/allowance/verbs/spend.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/allowance/spend.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.allowance.spend>>;

/** Spend from what is left of this month's allowance. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "allowance.spend",
  description: "Spend from what is left of this month's allowance.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { AllowanceExceeded: "AL-001", AllowanceNotActive: "AL-900", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.allowance.spend({ payload: args }), ctx),
});
