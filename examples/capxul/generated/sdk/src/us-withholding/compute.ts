// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/us-withholding/compute.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Work out one pay's US tax lines from its wage, frequency, pay date, work state, wages so far this year and W-4. */
export const compute = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["us-withholding"].compute({ payload })));
