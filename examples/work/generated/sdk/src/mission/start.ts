// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/start.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Start the mission once intake is done. From here the manager only orchestrates. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.start({ payload })));
