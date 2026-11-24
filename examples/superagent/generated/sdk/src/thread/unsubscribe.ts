// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/thread/unsubscribe.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Stop a ticket following a thread: a person's call, or the main agent's. */
export const unsubscribe = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.thread.unsubscribe({ payload })));
