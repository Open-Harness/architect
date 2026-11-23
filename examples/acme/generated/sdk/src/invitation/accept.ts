// Generated from blueprint/projections/sdk.ts. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/accept.ts";
import { Acme, call, type CallOptions } from "../client.ts";

/** Accept an invitation and become a member of its organisation. */
export const accept = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Acme, (client) => client.invitation.accept({ payload })));
