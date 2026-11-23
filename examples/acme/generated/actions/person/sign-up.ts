// Generated from blueprint/things/person/verbs/sign-up.ts. Do not edit.
import type { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import type * as Sdk from "../../sdk/src/index.ts";
import { declaration } from "../../api/src/person/sign-up.ts";

type Payload = PayloadOf<typeof declaration>;
type Answer = Effect.Success<ReturnType<typeof Sdk.person.signUp>>;

/** Sign up with an email address and a password. */
export const options = (host: ActionHost<Sdk.Acme["Service"]>): ActionOptions<Payload, Answer> => ({
  name: "person.sign-up",
  description: "Sign up with an email address and a password.",
  schema: declaration.payloadSchema,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { PersonEmailTaken: "PE-001" },
  run: (args, ctx) => host.call((client) => client.person["sign-up"]({ payload: args }), ctx),
});
