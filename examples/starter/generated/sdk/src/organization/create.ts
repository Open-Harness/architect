// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/organization/create.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Found an organisation. Whoever founds it owns it, and is its first member. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Starter, (client) => client.organization.create({ payload })));
