// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/account/balance.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** An account's balance on a day: its own ledger lines and those of every account under it. */
export const balance = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.account.balance({ payload })));
