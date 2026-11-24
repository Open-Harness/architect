// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/input/route.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Send a waiting Input to its running executor, or queue the Assignment that will start one. */
export const route = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.input.route({ payload })));
