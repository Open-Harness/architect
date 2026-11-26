// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/supplier/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one supplier by its id: company, supplierName, supplierType, supplierGroup, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.supplier.get({ payload })));
