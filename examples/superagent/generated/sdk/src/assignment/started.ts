// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/started.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Give a waiting Assignment a seat, if one is free for it. */
export const started = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment.started({ payload })));
