// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-grade/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a grade to a company. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-grade"].create({ payload })));
