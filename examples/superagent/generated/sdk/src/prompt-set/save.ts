// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/prompt-set/save.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Save a new version of the prompts. A save made from an older version is refused, with the current one. */
export const save = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["prompt-set"].save({ payload })));
