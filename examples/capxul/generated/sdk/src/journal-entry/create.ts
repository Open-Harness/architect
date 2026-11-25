// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/journal-entry/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Draft a journal entry with its lines. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["journal-entry"].create({ payload })));
