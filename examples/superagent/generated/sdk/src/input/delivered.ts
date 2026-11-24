// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/input/delivered.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The executor took the Input. */
export const delivered = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.input.delivered({ payload })));
