// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/agent/tell.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id. */
export const tell = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.agent.tell({ payload })));
