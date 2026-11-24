// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/attach.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Attach another thread to a ticket. */
export const attach = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.attach({ payload })));
