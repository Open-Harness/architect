// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-application/cancel.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Cancel a leave, open or approved. */
export const cancel = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["leave-application"].cancel({ payload })));
