// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/expire.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Give up on an eval that ran out of time: it is unavailable, and its triggers wait for another. */
export const expire = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.expire({ payload })));
