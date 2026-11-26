// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/supplier-group/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one supplier-group by its id: company, supplierGroupName, parentSupplierGroup, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["supplier-group"].get({ payload })));
