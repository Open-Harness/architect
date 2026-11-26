// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal-cycle/start.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Start a cycle, making an appraisal for each appraisee who has none yet. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["appraisal-cycle"].start({ payload })));
