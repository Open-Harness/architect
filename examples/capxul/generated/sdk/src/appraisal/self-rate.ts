// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal/self-rate.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Rate yourself against each of your appraisal's criteria, from 0 to 1. */
export const selfRate = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.appraisal["self-rate"]({ payload })));
