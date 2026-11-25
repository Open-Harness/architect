// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/cost-center/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a cost center to a company, under a group or as a root. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["cost-center"].create({ payload })));
