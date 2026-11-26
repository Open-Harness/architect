// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-component/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one salary-component by its id: company, salaryComponent, type, amount, account, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["salary-component"].get({ payload })));
