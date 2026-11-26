// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/personal-safe/claim.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Claim your Safe with the key you sign with, proving you hold it. This works out its address; nothing is sent to the chain. */
export const claim = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["personal-safe"].claim({ payload })));
