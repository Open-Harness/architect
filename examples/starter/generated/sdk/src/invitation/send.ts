// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/send.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Invite someone to an organisation by email. */
export const send = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.invitation.send({ payload })));
