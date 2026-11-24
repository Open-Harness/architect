// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/context.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Read what a judgement needs: the thread's history and what else it touches. */
export const context = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.context({ payload })));
