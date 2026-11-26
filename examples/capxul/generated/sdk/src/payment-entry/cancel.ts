// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payment-entry/cancel.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Cancel a submitted payment, posting a reversing ledger line for each it posted. */
export const cancel = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["payment-entry"].cancel({ payload })));
