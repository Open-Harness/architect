// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attendance-request/approve.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Approve a request, marking each of its days. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["attendance-request"].approve({ payload })));
