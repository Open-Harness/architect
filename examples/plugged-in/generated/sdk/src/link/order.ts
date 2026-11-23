// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/link/order.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Move a link to a zero-based position. A position past the end puts it last. */
export const order = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(PluggedIn, (client) => client.link.order({ payload })));
