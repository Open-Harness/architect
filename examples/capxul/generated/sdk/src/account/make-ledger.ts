// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/account/make-ledger.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Turn a group account with nothing under it into a ledger. */
export const makeLedger = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client.account["make-ledger"]({ payload })));
