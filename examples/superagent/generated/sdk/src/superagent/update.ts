// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/update.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Save a superagent's configuration as a new version; a stale save is refused. */
export const update = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.update({ payload })));
