// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/end.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle. */
export const end = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.end({ payload })));
