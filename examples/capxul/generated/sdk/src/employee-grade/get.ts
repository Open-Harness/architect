// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-grade/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employee-grade by its id: company, gradeName, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["employee-grade"].get({ payload })));
