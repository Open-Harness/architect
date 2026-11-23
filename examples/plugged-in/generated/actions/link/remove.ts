// Generated from blueprint/things/link/verbs/remove.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/link/remove.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.link.remove>>;

/** Remove a link from a public page. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "link.remove",
  description: "Remove a link from a public page.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { LinkNotListed: "LN-900", NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.link.remove({ payload: args }), ctx),
});
