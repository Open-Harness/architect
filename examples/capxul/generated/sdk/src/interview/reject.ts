// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview/reject.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark an interview rejected. */
export const reject = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.interview.reject({ payload })));
