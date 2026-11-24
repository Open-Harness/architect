// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/holiday/add.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add one day off to a holiday list. */
export const add = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.holiday.add({ payload })));
