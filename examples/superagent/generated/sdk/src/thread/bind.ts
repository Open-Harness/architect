// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/thread/bind.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Make the thread an event belongs to, once, for this superagent. */
export const bind = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.thread.bind({ payload })));
