// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/complete.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark a goal completed, setting its progress to 100. */
export const complete = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal.complete({ payload })));
