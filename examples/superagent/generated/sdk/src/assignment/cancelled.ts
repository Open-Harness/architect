// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/cancelled.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** End a pending Assignment that was never seated or told. */
export const cancelled = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment.cancelled({ payload })));
