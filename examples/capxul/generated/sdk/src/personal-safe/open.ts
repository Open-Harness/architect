// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/personal-safe/open.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Open your own Safe. It has no address until you claim it with the key you sign with. */
export const open = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["personal-safe"].open({ payload })));
