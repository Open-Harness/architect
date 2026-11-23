// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/resume.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Pick a paused mission up again. */
export const resume = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.resume({ payload })));
