// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit an appraisal, fixing its scores. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.appraisal.submit({ payload })));
