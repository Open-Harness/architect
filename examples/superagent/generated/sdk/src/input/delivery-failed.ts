// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/input/delivery-failed.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The outbox gave up telling the executor. */
export const deliveryFailed = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.input["delivery-failed"]({ payload })));
