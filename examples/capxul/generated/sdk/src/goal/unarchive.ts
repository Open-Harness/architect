// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/unarchive.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Bring an archived goal back: its status follows its progress again. */
export const unarchive = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal.unarchive({ payload })));
