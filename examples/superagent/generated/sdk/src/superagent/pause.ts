// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/pause.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session. */
export const pause = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.pause({ payload })));
