// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payroll-period/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Set up a company's payroll period. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["payroll-period"].create({ payload })));
