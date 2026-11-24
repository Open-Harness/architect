// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/outgoing-message/withdraw.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Drop a ticket's pending replies: it ended, or its superagent retired. */
export const withdraw = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["outgoing-message"].withdraw({ payload })));
