// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal/rate.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Score each KRA of an appraisal by hand, from 0 to 5. */
export const rate = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.appraisal.rate({ payload })));
