// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/get.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Read one allowance by its id: organization, member, limit, spent, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.allowance.get({ payload })));
