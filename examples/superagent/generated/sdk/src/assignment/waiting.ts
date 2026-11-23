// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/waiting.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** List assignments, oldest first, 255 to a page, filtered by superagent, the rows with why person ahead of the rest. */
export const waiting = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment.waiting({ payload })));
