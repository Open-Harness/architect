// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/list.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** List missions, newest first, 20 to a page, filtered by owner, state. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.list({ payload })));
