// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bridge-business/reject.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record that Bridge turned down a company's KYB, and why. */
export const reject = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bridge-business"].reject({ payload })));
