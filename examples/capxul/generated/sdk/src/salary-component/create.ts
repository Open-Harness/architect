// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-component/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["salary-component"].create({ payload })));
