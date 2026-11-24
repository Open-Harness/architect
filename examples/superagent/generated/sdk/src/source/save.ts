// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/source/save.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Save a connection: its kind and its configuration. */
export const save = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.source.save({ payload })));
