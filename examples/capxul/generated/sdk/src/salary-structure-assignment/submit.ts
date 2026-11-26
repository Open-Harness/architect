// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure-assignment/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit an assignment, so payroll pays the employee by its structure from its day on. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["salary-structure-assignment"].submit({ payload })));
