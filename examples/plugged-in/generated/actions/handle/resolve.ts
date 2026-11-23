// Generated from blueprint/things/handle/verbs/resolve.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/handle/resolve.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.handle.resolve>>;

/** Find the handle that holds a claimed name. A released or unclaimed name has none. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "handle.resolve",
  description: "Find the handle that holds a claimed name. A released or unclaimed name has none.",
  schema: declaration.payloadSchema,
  readOnly: true,
  needsApproval: false,
  agentTool: true,
  errors: { HandleNotFound: "HN-003" },
  run: (args, ctx) => host.call((client) => client.handle.resolve({ payload: args }), ctx),
});
