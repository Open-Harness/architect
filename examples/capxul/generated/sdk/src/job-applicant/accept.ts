// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-applicant/accept.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark an applicant accepted, once they have accepted their job offer. */
export const accept = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-applicant"].accept({ payload })));
