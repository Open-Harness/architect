// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/question/spike.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Not sure yet: turn the question into a spike task on its subject. */
export const spike = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.question.spike({ payload })));
