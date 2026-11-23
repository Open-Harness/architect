// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/close.ts";
import { Signup, call, type CallOptions } from "../client.ts";

/** Take a sheet down. Nobody can join it after this. */
export const close = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Signup, (client) => client.sheet.close({ payload })));
