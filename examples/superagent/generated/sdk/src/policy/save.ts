// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/policy/save.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Save a new version of the policy. A save made from an older version is refused, with the current one. */
export const save = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.policy.save({ payload })));
