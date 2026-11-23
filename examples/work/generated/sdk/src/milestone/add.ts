// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/milestone/add.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Add a milestone to a mission. Its tasks appear at once: its kinds over its subject. */
export const add = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Work, (client) => client.milestone.add({ payload })));
