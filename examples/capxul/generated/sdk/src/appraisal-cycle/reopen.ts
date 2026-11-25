// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal-cycle/reopen.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Put a completed cycle back in progress. */
export const reopen = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["appraisal-cycle"].reopen({ payload })));
