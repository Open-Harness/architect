// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/personal-safe/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one personal-safe by its id: person, saltNonce, signer, firstOwner, account, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["personal-safe"].get({ payload })));
