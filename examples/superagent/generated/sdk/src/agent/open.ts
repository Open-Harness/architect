// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/agent/open.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Make an agent of one kind, about one thing: any operation allowed to create one makes it. */
export const open = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.agent.open({ payload })));
