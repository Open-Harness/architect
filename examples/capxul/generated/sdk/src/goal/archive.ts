// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/archive.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Archive a goal: it no longer counts towards its parent or its appraisal. */
export const archive = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal.archive({ payload })));
