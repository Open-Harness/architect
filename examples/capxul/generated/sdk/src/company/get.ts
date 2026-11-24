// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/company/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.company.get({ payload })));
