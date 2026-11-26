// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/goal/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.goal.create({ payload })));
