// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure/submit.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Submit a salary structure, so it can be assigned. */
export const submit = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["salary-structure"].submit({ payload })));
