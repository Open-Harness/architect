// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/trigger/receive.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept. */
export const receive = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.trigger.receive({ payload })));
