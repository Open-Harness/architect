// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/expense/add.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add one expense to a claim still in draft. */
export const add = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.expense.add({ payload })));
