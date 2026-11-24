// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/policy/sync.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** List the accounts a connection's roster names. */
export const sync = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.policy.sync({ payload })));
