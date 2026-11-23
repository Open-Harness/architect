// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one employee by its id: company, person, firstName, gender, dateOfBirth, dateOfJoining, department, designation, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.employee.get({ payload })));
