// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one goal by its id: company, employee, appraisalCycle, kra, goalName, progress, isGroup, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.goal.get({ payload })));
