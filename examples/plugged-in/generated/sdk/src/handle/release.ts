// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/handle/release.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const release = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(PluggedIn, (client) => client.handle.release({ payload })));
