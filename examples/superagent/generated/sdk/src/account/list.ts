// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/account/list.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Let an account ask: its person's words may then start work. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.account.list({ payload })));
