// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/create.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Make a superagent, with its main agent, observing. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.create({ payload })));
