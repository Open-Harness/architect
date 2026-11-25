// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employment-type/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employment-type by its id: company, employmentTypeName, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["employment-type"].get({ payload })));
