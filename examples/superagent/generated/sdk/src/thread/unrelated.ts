// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/thread/unrelated.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The executor says a thread has nothing to do with its ticket. */
export const unrelated = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.thread.unrelated({ payload })));
