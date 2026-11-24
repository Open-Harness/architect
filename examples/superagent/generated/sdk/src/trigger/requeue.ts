// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/trigger/requeue.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Put a trigger back for evaluation. */
export const requeue = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.trigger.requeue({ payload })));
