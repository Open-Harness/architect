// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-separation/complete.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark a separation completed. The employee is relieved by its own call. */
export const complete = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-separation"].complete({ payload })));
