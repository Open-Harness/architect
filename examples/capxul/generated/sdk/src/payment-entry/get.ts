// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payment-entry/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one payment-entry by its id: company, paymentType, postingDate, partyType, party, paidFrom, paidTo, paidAmount, costCenter, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["payment-entry"].get({ payload })));
