// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/reopen.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Reopen a closed goal: its status follows its progress again. */
export const reopen = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal.reopen({ payload })));
