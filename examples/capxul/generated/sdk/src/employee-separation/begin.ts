// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-separation/begin.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Mark a separation in process. */
export const begin = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employee-separation"].begin({ payload })));
