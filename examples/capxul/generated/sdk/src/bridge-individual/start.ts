// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bridge-individual/start.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bridge-individual"].start({ payload })));
