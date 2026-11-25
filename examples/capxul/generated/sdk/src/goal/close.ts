// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/close.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Close a goal, keeping its progress. */
export const close = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal.close({ payload })));
