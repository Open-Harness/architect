// Generated from blueprint/things/link/verbs/add.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/link/add.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.link.add>>;

/** Append a link to your own public page. You need a claimed name first. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "link.add",
  description: "Append a link to your own public page. You need a claimed name first.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { LinkNeedsHandle: "LN-001", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.link.add({ payload: args }), ctx),
});
