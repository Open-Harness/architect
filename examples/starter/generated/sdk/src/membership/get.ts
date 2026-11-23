// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/membership/get.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Read one membership by its id: organization, person, role. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.membership.get({ payload })));
