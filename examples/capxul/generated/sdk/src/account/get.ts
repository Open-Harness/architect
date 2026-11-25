// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/account/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one account by its id: company, accountName, parentAccount, rootType, reportType, accountType, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.account.get({ payload })));
