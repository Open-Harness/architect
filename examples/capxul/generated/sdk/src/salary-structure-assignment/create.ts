// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure-assignment/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Assign a salary structure to an employee from a day on. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["salary-structure-assignment"].create({ payload })));
