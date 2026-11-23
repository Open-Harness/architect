// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/accept.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit. */
export const accept = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.accept({ payload })));
