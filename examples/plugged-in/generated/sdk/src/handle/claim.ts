// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/handle/claim.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Claim a free name and make it the address of your public page, with its profile. */
export const claim = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(PluggedIn, (client) => client.handle.claim({ payload })));
