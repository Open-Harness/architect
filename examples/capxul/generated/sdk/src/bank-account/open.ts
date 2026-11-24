// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bank-account/open.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Open a bank account for a company whose KYB Bridge approved: answers where to send deposits. */
export const open = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bank-account"].open({ payload })));
