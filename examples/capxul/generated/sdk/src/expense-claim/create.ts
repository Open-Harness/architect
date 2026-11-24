// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/expense-claim/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Start an employee's claim for expenses the company pays back. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["expense-claim"].create({ payload })));
