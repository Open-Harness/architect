// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bridge-individual/approve.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record that Bridge approved a person's KYC. */
export const approve = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bridge-individual"].approve({ payload })));
