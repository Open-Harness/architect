// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/ticket/resume.ts";
import { SuperagentClient, call, type CallOptions } from "../client.ts";

/** Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory. */
export const resume = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(SuperagentClient, (client) => client.ticket.resume({ payload })));
