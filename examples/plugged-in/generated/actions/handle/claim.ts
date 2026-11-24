// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/handle/claim.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.handle.claim>>;

/** Claim a free name and make it the address of your public page, with its profile. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "handle.claim",
  description: "Claim a free name and make it the address of your public page, with its profile.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { HandleTaken: "HN-001", HandleAlreadyOwned: "HN-002", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.handle.claim({ payload: args }), ctx),
});
