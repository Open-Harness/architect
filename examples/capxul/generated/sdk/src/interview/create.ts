// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Schedule an applicant's interview at a round, on a day, with the employees who interview. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.interview.create({ payload })));
