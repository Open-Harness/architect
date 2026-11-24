// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/outgoing-message/reply.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row. */
export const reply = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["outgoing-message"].reply({ payload })));
