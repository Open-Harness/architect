// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/prompt-set/history.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Every saved version, newest first, each row its number, when, by whom, and the one it was made from. */
export const history = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["prompt-set"].history({ payload })));
