// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-application/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one leave-application by its id: company, employee, leaveType, fromDate, toDate, reason, totalLeaveDays, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["leave-application"].get({ payload })));
