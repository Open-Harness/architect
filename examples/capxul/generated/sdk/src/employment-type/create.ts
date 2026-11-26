// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employment-type/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a way a company employs people. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["employment-type"].create({ payload })));
