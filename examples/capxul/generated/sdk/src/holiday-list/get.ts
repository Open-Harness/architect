// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/holiday-list/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one holiday-list by its id: company, holidayListName, fromDate, toDate, totalHolidays, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["holiday-list"].get({ payload })));
