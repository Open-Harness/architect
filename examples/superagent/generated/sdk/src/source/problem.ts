// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/source/problem.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Say a connection has failed three polls in a row: it shows as a problem until a poll succeeds. */
export const problem = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.source.problem({ payload })));
