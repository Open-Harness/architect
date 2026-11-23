// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/run/report.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Say how the run is going. It moves no card. */
export const report = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.run.report({ payload })));
