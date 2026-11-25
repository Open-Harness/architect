// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-offer/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Offer an applicant a job, under one of the company's job titles. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-offer"].create({ payload })));
