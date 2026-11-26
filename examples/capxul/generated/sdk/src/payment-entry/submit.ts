// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payment-entry/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit a payment, posting the party's ledger line and the bank's. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["payment-entry"].submit({ payload })));
