// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/input/store.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Store a message for a ticket's executor: a person's, or a followed thread's trigger. */
export const store = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.input.store({ payload })));
