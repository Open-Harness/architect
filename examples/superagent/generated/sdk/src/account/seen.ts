// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/account/seen.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Record an account an event came from: a new one is seen, a known one keeps its state. */
export const seen = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.account.seen({ payload })));
