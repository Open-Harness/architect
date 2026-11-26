// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/ack.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The executor acknowledges the message it was woken by, once, in one short reply. */
export const ack = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.ack({ payload })));
