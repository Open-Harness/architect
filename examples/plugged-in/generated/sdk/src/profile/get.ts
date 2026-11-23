// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/profile/get.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Read a claimed name's public page and its links in display order. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(PluggedIn, (client) => client.profile.get({ payload })));
