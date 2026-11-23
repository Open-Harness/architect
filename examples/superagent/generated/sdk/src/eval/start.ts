// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/start.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Make an eval for one thread's waiting triggers. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.start({ payload })));
