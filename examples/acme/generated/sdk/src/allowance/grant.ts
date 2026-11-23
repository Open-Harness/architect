// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/grant.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Let a member spend from the organisation, up to a limit each month. */
export const grant = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Acme, (client) => client.allowance.grant({ payload })));
