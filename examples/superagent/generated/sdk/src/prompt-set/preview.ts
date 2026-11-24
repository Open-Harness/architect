// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/prompt-set/preview.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Show the prompt an agent of one kind would get, with a draft applied. */
export const preview = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["prompt-set"].preview({ payload })));
