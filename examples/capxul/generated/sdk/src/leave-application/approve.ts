// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-application/approve.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Approve a leave, marking each of its days On Leave. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["leave-application"].approve({ payload })));
