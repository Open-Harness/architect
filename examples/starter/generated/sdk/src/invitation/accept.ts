// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/invitation/accept.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Accept an invitation and become a member of its organisation. */
export const accept = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.invitation.accept({ payload })));
