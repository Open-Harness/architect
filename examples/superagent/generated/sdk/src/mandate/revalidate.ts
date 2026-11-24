// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mandate/revalidate.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Check a ticket's mandate against the policy as it is now, before the ticket resumes. */
export const revalidate = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.mandate.revalidate({ payload })));
