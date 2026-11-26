// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/journal-entry-account/list.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** List journal-entry-accounts, oldest first, 50 to a page, filtered by journalEntry. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["journal-entry-account"].list({ payload })));
