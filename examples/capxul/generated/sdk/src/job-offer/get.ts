// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-offer/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one job-offer by its id: company, jobApplicant, designation, offerDate, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["job-offer"].get({ payload })));
