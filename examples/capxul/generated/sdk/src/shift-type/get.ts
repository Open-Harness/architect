// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/shift-type/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one shift-type by its id: company, shiftTypeName, startTime, endTime, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["shift-type"].get({ payload })));
