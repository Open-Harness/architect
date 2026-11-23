// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/api-key/create.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Create an API key in an organisation. The key itself is shown once. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client["api-key"].create({ payload })));
