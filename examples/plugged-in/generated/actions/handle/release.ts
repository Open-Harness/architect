// Generated from blueprint/things/handle/verbs/release.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/handle/release.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.handle.release>>;

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "handle.release",
  description: "Free your name and take its public page offline. Anyone may claim the name afterwards.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: true,
  agentTool: true,
  errors: { HandleNotClaimed: "HN-900", NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.handle.release({ payload: args }), ctx),
});
