// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee-separation/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employee-separation by its id: company, employee, resignationLetterDate, boardingBeginsOn, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["employee-separation"].get({ payload })));
