// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/finish.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** The run pushed its branch. CI proves it; the run cannot close its own task. */
export const finish = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.run.finish({ payload })));
