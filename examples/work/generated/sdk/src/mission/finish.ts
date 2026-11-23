// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/finish.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Close the mission: every task is closed by a fact up to its target. */
export const finish = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.finish({ payload })));
