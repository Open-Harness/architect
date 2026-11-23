// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/get.ts";
import { Work, call, type CallOptions } from "../client.ts";

/** Read one mission by its id: owner, title, target, blueprint, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Work, (client) => client.mission.get({ payload })));
