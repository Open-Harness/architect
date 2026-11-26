// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payroll-entry/submit-slips.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit a payroll entry's salary slips, booking their pay in one accrual journal entry. */
export const submitSlips = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["payroll-entry"]["submit-slips"]({ payload })));
