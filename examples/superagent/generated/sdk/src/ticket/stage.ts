// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/stage.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Read one ticket by its id: superagent, title, state. */
export const stage = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.stage({ payload })));
