// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/policy-changed.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Tell the live tickets the policy changed under them. */
export const policyChanged = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket["policy-changed"]({ payload })));
