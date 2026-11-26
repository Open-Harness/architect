// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-slip/list.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** List salary-slips, oldest first, 100 to a page, filtered by employee, payrollEntry. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["salary-slip"].list({ payload })));
