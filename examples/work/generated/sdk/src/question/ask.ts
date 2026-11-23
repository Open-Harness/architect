// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/ask.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. */
export const ask = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Work, (client) => client.question.ask({ payload })));
