// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/agent/close.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Stop an agent's turn for one Assignment and say so: the seat that held it is then free. */
export const close = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.agent.close({ payload })));
