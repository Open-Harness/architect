// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/note.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Write a note on a ticket that does not wake its executor. */
export const note = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.note({ payload })));
