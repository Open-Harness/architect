// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/answer.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Answer a question with one of its letters. */
export const answer = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.question.answer({ payload })));
