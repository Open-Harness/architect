// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/stop.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Stop a ticket: its mandate is withdrawn and its executor's turn closed. */
export const stop = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.stop({ payload })));
