// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-transfer/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit a transfer on or after its day, giving the employee the new department. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-transfer"].submit({ payload })));
