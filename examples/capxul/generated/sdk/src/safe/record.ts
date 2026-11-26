// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/safe/record.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain. */
export const record = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.safe.record({ payload })));
