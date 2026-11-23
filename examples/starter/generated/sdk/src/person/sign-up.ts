// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/person/sign-up.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Sign up with an email address and a password. */
export const signUp = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.person["sign-up"]({ payload })));
