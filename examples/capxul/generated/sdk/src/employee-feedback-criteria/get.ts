// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-feedback-criteria/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employee-feedback-criteria by its id: company, criteria, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["employee-feedback-criteria"].get({ payload })));
