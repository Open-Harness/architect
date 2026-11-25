// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Draft a salary structure with its earnings and deductions. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["salary-structure"].create({ payload })));
