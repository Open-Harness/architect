// Generated from blueprint/things/allowance/verbs/grant.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/allowance/grant.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.allowance.grant>>;

/** Let a member spend from the organisation, up to a limit each month. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "allowance.grant",
  description: "Let a member spend from the organisation, up to a limit each month.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { AllowanceLimitTooHigh: "AL-003", PersonNotFound: "PE-901", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.allowance.grant({ payload: args }), ctx),
});
