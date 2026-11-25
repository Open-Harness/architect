// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bank-transaction/send.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Send money out of a company's bank account to a payee, through Bridge. */
export const send = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["bank-transaction"].send({ payload })));
