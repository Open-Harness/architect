// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-applicant/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a person who applied for a job opening. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-applicant"].create({ payload })));
