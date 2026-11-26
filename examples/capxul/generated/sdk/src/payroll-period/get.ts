// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payroll-period/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one payroll-period by its id: company, payrollPeriodName, startDate, endDate, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["payroll-period"].get({ payload })));
