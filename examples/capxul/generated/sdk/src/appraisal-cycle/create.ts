// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/appraisal-cycle/create.ts";
import { Capxul, call, type CallOptions } from "../client.ts";

/** Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call(declaration, payload, options, true, Effect.flatMap(Capxul, (client) => client["appraisal-cycle"].create({ payload })));
