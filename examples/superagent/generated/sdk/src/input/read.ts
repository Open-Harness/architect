// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/input/read.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Read one Input's text. */
export const read = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.input.read({ payload })));
