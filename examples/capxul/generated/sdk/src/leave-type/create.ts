// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/leave-type/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Add a kind of leave a company gives. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["leave-type"].create({ payload })));
