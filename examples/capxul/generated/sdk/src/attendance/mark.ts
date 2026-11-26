// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attendance/mark.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark whether an employee was at work on a day. */
export const mark = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.attendance.mark({ payload })));
