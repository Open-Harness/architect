// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/trigger/reevaluate.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Ask the main agent to judge a trigger again. */
export const reevaluate = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.trigger.reevaluate({ payload })));
