// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/retire.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Close a superagent's connections and agents. */
export const retire = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.retire({ payload })));
