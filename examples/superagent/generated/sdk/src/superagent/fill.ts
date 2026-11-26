// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/fill.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Start waiting Assignments, in line, while seats are free. Does nothing while paused. */
export const fill = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.fill({ payload })));
