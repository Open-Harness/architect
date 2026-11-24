// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/holiday/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one holiday by its id: holidayList, holidayDate, description, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.holiday.get({ payload })));
