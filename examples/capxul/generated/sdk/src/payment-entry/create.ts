// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payment-entry/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Draft a payment received from a party or paid to one, with no invoice: an advance. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["payment-entry"].create({ payload })));
