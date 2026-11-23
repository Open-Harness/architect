// Generated from blueprint/things/profile/verbs/get.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/profile/get.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.profile.get>>;

/** Read a claimed name's public page and its links in display order. */
export const options = (host: ActionHost<Sdk.PluggedIn["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "profile.get",
  description: "Read a claimed name's public page and its links in display order.",
  schema: declaration.payloadSchema,
  readOnly: true,
  needsApproval: false,
  agentTool: true,
  errors: { ProfileNotFound: "PR-001" },
  run: (args, ctx) => host.call((client) => client.profile.get({ payload: args }), ctx),
});
