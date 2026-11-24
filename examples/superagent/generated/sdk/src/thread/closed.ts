// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/thread/closed.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Say a thread closed: a merged pull request, a closed issue. */
export const closed = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.thread.closed({ payload })));
