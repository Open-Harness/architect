// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-offer/accept.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record that the applicant accepted the offer. */
export const accept = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-offer"].accept({ payload })));
