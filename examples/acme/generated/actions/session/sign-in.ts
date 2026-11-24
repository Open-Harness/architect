// Generated from blueprint/things/session/verbs/sign-in.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/session/sign-in.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.session.signIn>>;

/** Sign in with email and password. The token is the bearer for every later call. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "session.sign-in",
  description: "Sign in with email and password. The token is the bearer for every later call.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { SessionCredentialsWrong: "SE-001" },
  run: (args, ctx) => host.call((client) => client.session["sign-in"]({ payload: args }), ctx),
});
