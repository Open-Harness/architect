// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/customer/enable.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Enable a disabled customer again. */
export const enable = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.customer.enable({ payload })));
