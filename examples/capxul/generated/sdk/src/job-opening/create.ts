// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-opening/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Open a job under one of a company's job titles, for some number of people. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["job-opening"].create({ payload })));
