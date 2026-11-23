// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/revoke.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Withdraw an invitation that hasn't been accepted. */
export const revoke = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.invitation.revoke({ payload })));
