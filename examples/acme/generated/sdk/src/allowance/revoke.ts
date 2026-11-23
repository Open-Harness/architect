// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/revoke.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Stop an allowance. Nothing more can be spent from it. */
export const revoke = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.allowance.revoke({ payload })));
