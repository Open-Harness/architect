// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/supplier/disable.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Disable a supplier: no payment to it can be submitted until it is enabled again. */
export const disable = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.supplier.disable({ payload })));
