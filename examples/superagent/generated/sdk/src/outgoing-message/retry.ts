// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/outgoing-message/retry.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Queue a failed reply again, once its wait has passed. */
export const retry = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client["outgoing-message"].retry({ payload })));
