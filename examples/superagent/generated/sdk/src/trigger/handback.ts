// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/trigger/handback.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The executor hands a trigger back: it was not its to answer. */
export const handback = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.trigger.handback({ payload })));
