// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-promotion/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Draft a promotion: an employee's new job title, from a day. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-promotion"].create({ payload })));
