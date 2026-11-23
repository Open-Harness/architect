// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/attention/approve.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Say yes. For a promote, the promote runs. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.attention.approve({ payload })));
