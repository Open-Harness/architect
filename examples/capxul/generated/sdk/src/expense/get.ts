// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/expense/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one expense by its id: expenseClaim, expenseDate, expenseType, amount, sanctionedAmount, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.expense.get({ payload })));
