// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure/cancel.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Cancel a submitted salary structure no assignment or salary slip uses. */
export const cancel = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["salary-structure"].cancel({ payload })));
