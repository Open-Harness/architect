// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/payroll-entry/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit a payroll entry, making a draft salary slip for each of its employees. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["payroll-entry"].submit({ payload })));
