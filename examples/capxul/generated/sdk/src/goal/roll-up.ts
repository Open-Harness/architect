// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/roll-up.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Bring a group goal's status up to date with the progress its children have rolled up. */
export const rollUp = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal["roll-up"]({ payload })));
