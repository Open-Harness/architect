// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/send.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Invite someone to an organisation by email. */
export const send = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.invitation.send({ payload })));
