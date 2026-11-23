// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/eval/decide.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Record one judgement per enabled rule. */
export const decide = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.eval.decide({ payload })));
