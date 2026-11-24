// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/superagent/boot.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost. */
export const boot = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.superagent.boot({ payload })));
