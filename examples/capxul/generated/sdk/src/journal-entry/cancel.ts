// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/journal-entry/cancel.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Cancel a submitted journal entry, posting a reversing ledger line for each it posted. */
export const cancel = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["journal-entry"].cancel({ payload })));
