// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-performance-feedback/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-performance-feedback"].create({ payload })));
