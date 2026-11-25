// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-promotion/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employee-promotion by its id: company, employee, promotionDate, currentDesignation, newDesignation, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["employee-promotion"].get({ payload })));
