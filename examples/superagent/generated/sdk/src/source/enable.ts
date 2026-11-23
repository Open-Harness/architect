// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/source/enable.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Start listening on a connection. */
export const enable = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.source.enable({ payload })));
