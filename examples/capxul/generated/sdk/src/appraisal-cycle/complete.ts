// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal-cycle/complete.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark a cycle completed once every appraisal in it is submitted. */
export const complete = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["appraisal-cycle"].complete({ payload })));
