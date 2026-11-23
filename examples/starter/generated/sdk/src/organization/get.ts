// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/organization/get.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Read one organization by its id: name, owner, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.organization.get({ payload })));
