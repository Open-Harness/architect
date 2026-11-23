// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/organization/get.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Read one organization by its id: name, owner, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.organization.get({ payload })));
