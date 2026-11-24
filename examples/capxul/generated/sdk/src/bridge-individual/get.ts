// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/bridge-individual/get.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Read one bridge-individual by its id: person, fullName, email, kycLink, tosLink, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["bridge-individual"].get({ payload })));
