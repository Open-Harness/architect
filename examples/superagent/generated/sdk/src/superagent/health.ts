// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/health.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Read one superagent by its id: name, state, pausedAt. */
export const health = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.health({ payload })));
