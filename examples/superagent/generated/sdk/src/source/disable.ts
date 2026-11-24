// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/source/disable.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Stop listening on a connection; its triggers already recorded stay. */
export const disable = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.source.disable({ payload })));
