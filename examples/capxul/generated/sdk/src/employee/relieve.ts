// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee/relieve.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record that an employee has left the company, on the day they were relieved. */
export const relieve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.employee.relieve({ payload })));
