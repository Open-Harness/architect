// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-slip/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one salary-slip by its id: company, employee, payrollEntry, salaryStructure, postingDate, startDate, endDate, grossPay, totalDeduction, netPay, status, journalEntry. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["salary-slip"].get({ payload })));
