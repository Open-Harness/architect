// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/read.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Read one page of a thread, through its connection. */
export const read = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.read({ payload })));
