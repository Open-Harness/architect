// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/employee/hire.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Hire a person into a company, placed in one of its departments under one of its job titles. */
export const hire = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.employee.hire({ payload })));
