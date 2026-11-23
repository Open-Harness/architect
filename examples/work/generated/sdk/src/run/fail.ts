// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/fail.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** The run gave up, saying why. */
export const fail = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.run.fail({ payload })));
