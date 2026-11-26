// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-performance-feedback/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit your feedback, counting it in the appraisal's average. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-performance-feedback"].submit({ payload })));
