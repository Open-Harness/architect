// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bank-transaction/settle.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record that Bridge paid a transfer out. */
export const settle = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bank-transaction"].settle({ payload })));
