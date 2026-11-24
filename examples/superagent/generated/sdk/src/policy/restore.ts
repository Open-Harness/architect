// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/policy/restore.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Save an earlier version again, as a new one. */
export const restore = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.policy.restore({ payload })));
