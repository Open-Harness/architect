// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one appraisal by its id: company, employee, appraisalCycle, appraisalTemplate, kraEvaluationMethod, kras, selfRatings, totalScore, selfScore, avgFeedbackScore, finalScore, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.appraisal.get({ payload })));
