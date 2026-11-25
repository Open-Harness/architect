// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/journal-entry/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one journal-entry by its id: company, postingDate, userRemark, totalDebit, totalCredit, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["journal-entry"].get({ payload })));
