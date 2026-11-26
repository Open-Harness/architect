// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/salary-detail/list.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** List salary-details, oldest first, 100 to a page, filtered by salaryStructure. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, false, Effect.flatMap(Capxul, (client) => client["salary-detail"].list({ payload })));
