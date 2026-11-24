// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/delivered.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it. */
export const delivered = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.delivered({ payload })));
