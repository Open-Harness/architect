// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/list.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** List questions, oldest first, 50 to a page, filtered by mission, state. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.question.list({ payload })));
