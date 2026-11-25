// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-performance-feedback/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employee-performance-feedback by its id: company, appraisal, appraisalCycle, employee, reviewer, feedback, ratings, totalScore, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["employee-performance-feedback"].get({ payload })));
