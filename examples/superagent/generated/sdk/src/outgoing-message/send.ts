// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/outgoing-message/send.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success. */
export const send = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["outgoing-message"].send({ payload })));
