// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/proposal/waiting.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** List proposals, oldest first, 25 to a page, filtered by superagent. */
export const waiting = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.proposal.waiting({ payload })));
