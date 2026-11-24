// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/expense-claim/approve.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Approve a claim, owing the employee what was sanctioned. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["expense-claim"].approve({ payload })));
