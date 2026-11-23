// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/session/sign-in.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Sign in with email and password. The token is the bearer for every later call. */
export const signIn = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.session["sign-in"]({ payload })));
