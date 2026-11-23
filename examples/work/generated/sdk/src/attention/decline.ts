// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attention/decline.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Say not yet, and why. The task stays where its facts put it. */
export const decline = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.attention.decline({ payload })));
