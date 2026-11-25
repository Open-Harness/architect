// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/account/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add an account to a company's chart, under a group or as a root. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.account.create({ payload })));
