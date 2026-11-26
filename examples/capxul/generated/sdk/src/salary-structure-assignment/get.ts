// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-structure-assignment/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one salary-structure-assignment by its id: company, employee, salaryStructure, fromDate, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["salary-structure-assignment"].get({ payload })));
