// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/open.ts";
import { Signup, call, type CallOptions } from "../client.ts";

/** Put up a sheet with a number of places. */
export const open = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Signup, (client) => client.sheet.open({ payload })));
