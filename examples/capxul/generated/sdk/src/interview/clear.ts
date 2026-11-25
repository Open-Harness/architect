// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview/clear.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark an interview cleared. */
export const clear = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.interview.clear({ payload })));
