// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-applicant/hold.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Put an applicant on hold. */
export const hold = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-applicant"].hold({ payload })));
