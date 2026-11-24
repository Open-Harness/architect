// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/proposal/reject.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Turn a proposal down. */
export const reject = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.proposal.reject({ payload })));
