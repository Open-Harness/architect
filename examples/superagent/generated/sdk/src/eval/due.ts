// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/due.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** One pass of the eval clock: batch each thread's waiting triggers into an eval, and expire the ones that ran out of time. Not armed again while paused. */
export const due = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.due({ payload })));
