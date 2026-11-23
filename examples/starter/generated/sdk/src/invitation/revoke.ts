// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/revoke.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Withdraw an invitation that hasn't been accepted. */
export const revoke = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.invitation.revoke({ payload })));
