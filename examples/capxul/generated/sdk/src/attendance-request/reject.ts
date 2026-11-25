// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attendance-request/reject.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Reject a request, marking none of its days. */
export const reject = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["attendance-request"].reject({ payload })));
