// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payroll-entry/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one payroll-entry by its id: company, postingDate, startDate, endDate, costCenter, payrollPayableAccount, numberOfEmployees, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["payroll-entry"].get({ payload })));
