// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/get.ts";
import { Signup, call, type CallOptions } from "../client.ts";

/** Read one sheet by its id: title, places, taken, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Signup, (client) => client.sheet.get({ payload })));
