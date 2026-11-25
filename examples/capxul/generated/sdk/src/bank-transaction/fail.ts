// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bank-transaction/fail.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record that Bridge couldn't pay a transfer out, and how it ended. */
export const fail = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bank-transaction"].fail({ payload })));
