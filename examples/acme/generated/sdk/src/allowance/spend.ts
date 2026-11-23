// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/spend.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Spend from what is left of this month's allowance. */
export const spend = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Acme, (client) => client.allowance.spend({ payload })));
