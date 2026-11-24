// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/interrupted.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed. */
export const interrupted = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment.interrupted({ payload })));
