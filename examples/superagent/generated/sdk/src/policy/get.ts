// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/policy/get.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Read the policy: the current version, or the one named. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.policy.get({ payload })));
