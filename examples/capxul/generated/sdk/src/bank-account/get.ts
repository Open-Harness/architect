// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bank-account/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one bank-account by its id: company, business, accountName, currency, bankName, accountNumber, routingNumber, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["bank-account"].get({ payload })));
