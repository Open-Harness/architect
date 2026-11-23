// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/turn-ended.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The Agent idled on this Assignment or closed it: it ends, and its seat is free. */
export const turnEnded = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment["turn-ended"]({ payload })));
