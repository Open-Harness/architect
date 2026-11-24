// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/request-status.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Ask a ticket's executor where it stands; a person's request may use the seat kept for a person. */
export const requestStatus = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket["request-status"]({ payload })));
