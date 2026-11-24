// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/shift-type/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a working shift to a company, from its start time to its end time. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["shift-type"].create({ payload })));
