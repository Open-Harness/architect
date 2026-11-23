// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/reap.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed. */
export const reap = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.reap({ payload })));
