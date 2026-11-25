// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/interview-round/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a stage of hiring to a company, with the employees who interview at it. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["interview-round"].create({ payload })));
