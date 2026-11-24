// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one interview by its id: company, jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.interview.get({ payload })));
