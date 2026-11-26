// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/update-progress.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Set how far along a goal is, from 0 to 100. */
export const updateProgress = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal["update-progress"]({ payload })));
