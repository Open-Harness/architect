// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/journal-entry/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit a balanced journal entry, posting one ledger line per line. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["journal-entry"].submit({ payload })));
