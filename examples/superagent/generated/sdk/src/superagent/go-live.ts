// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/go-live.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Let a superagent act: a person, after reading what it would have accepted. */
export const goLive = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent["go-live"]({ payload })));
