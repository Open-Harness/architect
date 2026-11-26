// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/supplier/balance.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** A supplier's balance on a day, from the ledger lines posted with it as their party. */
export const balance = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.supplier.balance({ payload })));
