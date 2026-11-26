// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/job-opening/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one job-opening by its id: company, designation, jobTitle, vacancies, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["job-opening"].get({ payload })));
