// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/designation/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one designation by its id: company, designationName, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.designation.get({ payload })));
