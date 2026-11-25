// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-application/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Ask for leave of one type, from one day to another, and why. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["leave-application"].create({ payload })));
