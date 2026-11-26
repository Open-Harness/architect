// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-allocation/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one leave-allocation by its id: company, employee, leaveType, fromDate, toDate, newLeavesAllocated, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["leave-allocation"].get({ payload })));
