// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/expense-claim/reject.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Reject a claim, so nothing of it is paid back. */
export const reject = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["expense-claim"].reject({ payload })));
