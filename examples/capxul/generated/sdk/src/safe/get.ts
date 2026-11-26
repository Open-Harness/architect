// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/safe/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one safe by its id: kind, person, company, account, firstOwner, owners, threshold, saltNonce, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client.safe.get({ payload })));
