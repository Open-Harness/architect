// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/link/remove.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Remove a link from a public page. */
export const remove = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(PluggedIn, (client) => client.link.remove({ payload })));
