// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/person/sign-up.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Sign up with an email address and a password. */
export const signUp = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.person["sign-up"]({ payload })));
