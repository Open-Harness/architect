// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview-feedback/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one interview-feedback by its id: company, interview, interviewer, result, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["interview-feedback"].get({ payload })));
