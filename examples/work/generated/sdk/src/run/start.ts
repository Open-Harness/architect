// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/start.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Start an agent on one task. The run claims the task until it ends. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Work, (client) => client.run.start({ payload })));
