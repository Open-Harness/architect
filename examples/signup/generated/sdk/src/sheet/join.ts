// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/join.ts";
import { Signup, call, type CallOptions } from "../client.ts";

/** Take places on a sheet, for yourself and anyone with you. */
export const join = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Signup, (client) => client.sheet.join({ payload })));
