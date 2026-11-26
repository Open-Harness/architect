// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/customer/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one customer by its id: company, customerName, customerType, customerGroup, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.customer.get({ payload })));
