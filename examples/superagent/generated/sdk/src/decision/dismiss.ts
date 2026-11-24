// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/decision/dismiss.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Set aside a decision a person disagrees with. */
export const dismiss = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.decision.dismiss({ payload })));
