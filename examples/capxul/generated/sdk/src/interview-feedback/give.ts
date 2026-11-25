// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview-feedback/give.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Give an interviewer's feedback on an interview: cleared or rejected. */
export const give = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["interview-feedback"].give({ payload })));
