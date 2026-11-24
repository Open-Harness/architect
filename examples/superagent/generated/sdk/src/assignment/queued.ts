// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/assignment/queued.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it. */
export const queued = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.assignment.queued({ payload })));
