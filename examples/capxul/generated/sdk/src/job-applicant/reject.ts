// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-applicant/reject.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Turn an applicant down. */
export const reject = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-applicant"].reject({ payload })));
