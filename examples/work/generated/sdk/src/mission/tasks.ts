// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/tasks.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** The mission's tasks, each in the column its facts put it in. */
export const tasks = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.tasks({ payload })));
