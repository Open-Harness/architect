// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/list.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** List goals, oldest first, 50 to a page, filtered by appraisalCycle, employee. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.goal.list({ payload })));
