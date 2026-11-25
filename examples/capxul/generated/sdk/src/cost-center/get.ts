// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/cost-center/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one cost-center by its id: company, costCenterName, parentCostCenter, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["cost-center"].get({ payload })));
