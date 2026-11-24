// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/holiday-list/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Start a company's list of days off, between two days. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["holiday-list"].create({ payload })));
