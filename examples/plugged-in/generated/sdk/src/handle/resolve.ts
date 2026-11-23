// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/handle/resolve.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Find the handle that holds a claimed name. A released or unclaimed name has none. */
export const resolve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(PluggedIn, (client) => client.handle.resolve({ payload })));
