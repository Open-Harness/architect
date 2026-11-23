// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bridge-business/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one bridge-business by its id: company, legalName, email, kybLink, tosLink, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["bridge-business"].get({ payload })));
