// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/source/position-advanced.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Record how far a connection has read, after a poll. */
export const positionAdvanced = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.source["position-advanced"]({ payload })));
