// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-allocation/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit an allocation, so its leave days can be taken. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["leave-allocation"].submit({ payload })));
