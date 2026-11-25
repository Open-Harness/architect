// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bank-transaction/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one bank-transaction by its id: company, account, date, deposit, withdrawal, currency, reference, party, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["bank-transaction"].get({ payload })));
