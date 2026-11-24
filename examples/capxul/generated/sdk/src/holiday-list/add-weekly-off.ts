// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/holiday-list/add-weekly-off.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Make every given weekday in a holiday list a day off. */
export const addWeeklyOff = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["holiday-list"]["add-weekly-off"]({ payload })));
