// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-type/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one leave-type by its id: company, leaveTypeName, maxContinuousDaysAllowed, isLwp, includeHoliday, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["leave-type"].get({ payload })));
