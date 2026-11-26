// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one salary-structure by its id: company, salaryStructureName, totalEarning, totalDeduction, netPay, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["salary-structure"].get({ payload })));
