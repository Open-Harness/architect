// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-allocation/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Give an employee leave days of one type, between two days, as a draft. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["leave-allocation"].create({ payload })));
