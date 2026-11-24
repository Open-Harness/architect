// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/report.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** The executor says how the work stands: progress, waiting, ready, blocked, failed or dropped. */
export const report = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.report({ payload })));
