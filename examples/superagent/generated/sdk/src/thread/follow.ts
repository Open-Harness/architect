// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/thread/follow.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The executor follows a thread: its next messages go straight to it, with no eval. */
export const follow = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.thread.follow({ payload })));
