// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal-cycle/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one appraisal-cycle by its id: company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["appraisal-cycle"].get({ payload })));
