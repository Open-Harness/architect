// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/customer-group/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a customer group to a company, under a group or as its one root. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["customer-group"].create({ payload })));
