// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/fiscal-year/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one fiscal-year by its id: company, year, yearStartDate, yearEndDate, isShortYear, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["fiscal-year"].get({ payload })));
