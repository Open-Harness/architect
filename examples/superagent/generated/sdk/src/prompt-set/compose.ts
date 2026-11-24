// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/prompt-set/compose.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Make the prompt for one agent's model request, from the current version. */
export const compose = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["prompt-set"].compose({ payload })));
