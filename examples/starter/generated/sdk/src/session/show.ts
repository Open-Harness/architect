// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/session/show.ts";
import { Starter, call, type CallOptions } from "../client.ts";

/** Who is signed in. */
export const show = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Starter, (client) => client.session.show({ payload })));
