// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/proposal/propose.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Record what a main agent would change, and why: nothing changes until a person approves it. */
export const propose = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.proposal.propose({ payload })));
