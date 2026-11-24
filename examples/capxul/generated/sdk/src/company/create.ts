// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/company/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Set up a company; the person who sets it up runs it. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.company.create({ payload })));
