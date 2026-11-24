// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/proposal/approve.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Apply a proposal. Only a signed-in person, through a session: text that reached a model is never an approval. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.proposal.approve({ payload })));
