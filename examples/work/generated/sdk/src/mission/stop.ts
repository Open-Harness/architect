// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/stop.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Stop the mission for good. Its runs are stopped with it. */
export const stop = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.stop({ payload })));
