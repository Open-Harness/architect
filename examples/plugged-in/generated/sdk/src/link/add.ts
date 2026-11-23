// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/link/add.ts";
import { PluggedIn, call, type CallOptions } from "../client.ts";

/** Append a link to your own public page. You need a claimed name first. */
export const add = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(PluggedIn, (client) => client.link.add({ payload })));
