// Generated from blueprint/things/link/verbs/order.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/link/order.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.link.order>>;

/** Move a link to a zero-based position. A position past the end puts it last. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "link.order",
  description: "Move a link to a zero-based position. A position past the end puts it last.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { LinkAlreadyRemoved: "LN-002", NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.link.order({ payload: args }), ctx),
});
