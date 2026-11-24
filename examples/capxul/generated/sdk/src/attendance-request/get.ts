// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attendance-request/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one attendance-request by its id: company, employee, fromDate, toDate, reason, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["attendance-request"].get({ payload })));
