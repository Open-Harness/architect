// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/stop.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Stop the run. A person's act, or the mission stopping. */
export const stop = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.run.stop({ payload })));
