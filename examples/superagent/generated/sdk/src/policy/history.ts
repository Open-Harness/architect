// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/policy/history.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step. */
export const history = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.policy.history({ payload })));
